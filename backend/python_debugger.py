import sys
import tempfile
import subprocess
import traceback
import json
import io
import uuid
from contextlib import redirect_stdout, redirect_stderr

class SimpleTracer:
    def __init__(self):
        self.debug_states = []
        self.current_call_stack = []
        self.call_stack_ids = {}  # To track parent-child relationships
        self.call_history = []    # To track call hierarchy
        self.line_execution_count = {}
        self.call_id_counter = 0  # For generating unique call IDs

    def trace_calls(self, frame, event, arg):
        """Trace function calls"""
        if event == 'call':
            func_name = frame.f_code.co_name
            line_no = frame.f_lineno
            filename = frame.f_code.co_filename
            
            # Skip library code
            if '<frozen' in filename or '/lib/' in filename:
                return None
            
            # Generate unique call ID for this function call
            self.call_id_counter += 1
            call_id = f"{func_name}_{self.call_id_counter}"
            
            # Determine parent call ID
            parent_id = None
            if self.current_call_stack:
                parent_id = self.current_call_stack[-1].get('call_id')
            
            # Add to call stack
            call_info = {
                'function': func_name,
                'line': line_no,
                'file': filename,
                'call_id': call_id,
                'parent_id': parent_id,
                'stack_depth': len(self.current_call_stack)
            }
            
            self.current_call_stack.append(call_info)
            self.call_history.append({
                'call_id': call_id,
                'parent_id': parent_id,
                'function': func_name,
                'entry_line': line_no,
                'stack_depth': len(self.current_call_stack) - 1,
                'children': []
            })
            
            # Update parent's children list
            if parent_id:
                for call in self.call_history:
                    if call['call_id'] == parent_id:
                        call['children'].append(call_id)
                        break
                
        return self.trace_lines
        
    def trace_lines(self, frame, event, arg):
        """Trace line execution"""
        if event == 'line':
            filename = frame.f_code.co_filename
            
            # Skip library code
            if '<frozen' in filename or '/lib/' in filename:
                return
                
            line_no = frame.f_lineno
            func_name = frame.f_code.co_name
            
            # Collect local variables
            variables = {}
            for name, value in frame.f_locals.items():
                try:
                    # Convert values to strings to ensure they're serializable
                    if isinstance(value, (int, float, bool, str, type(None))):
                        variables[name] = value
                    elif hasattr(value, '__dict__'):
                        variables[name] = str(value)
                    else:
                        variables[name] = repr(value)
                except:
                    variables[name] = "Error: Unparseable value"
            
            # Get current call info
            current_call_info = self.current_call_stack[-1] if self.current_call_stack else None
            call_id = current_call_info.get('call_id') if current_call_info else None
            parent_id = current_call_info.get('parent_id') if current_call_info else None
            stack_depth = len(self.current_call_stack)
            
            # Get full call stack info
            call_stack = []
            for call in self.current_call_stack:
                call_stack.append({
                    'function': call['function'],
                    'line': call['line'],
                    'call_id': call['call_id'],
                    'parent_id': call['parent_id'],
                })
            
            # Add to debug states
            self.debug_states.append({
                'lineNumber': line_no,
                'functionName': func_name,
                'variables': variables,
                'callStack': call_stack,
                'callId': call_id,
                'parentId': parent_id,
                'stackDepth': stack_depth,
                'eventType': 'step'
            })
            
            # Track line execution count (for handling recursion)
            line_key = f"{filename}:{line_no}"
            self.line_execution_count[line_key] = self.line_execution_count.get(line_key, 0) + 1
        
        elif event == 'return':
            if self.current_call_stack:
                func_name = frame.f_code.co_name
                line_no = frame.f_lineno
                
                # Collect return value
                return_value = None
                if arg is not None:
                    try:
                        if isinstance(arg, (int, float, bool, str, type(None))):
                            return_value = arg
                        else:
                            return_value = repr(arg)
                    except:
                        return_value = "Error: Unparseable return value"
                
                # Get call info before popping from stack
                current_call_info = self.current_call_stack[-1]
                call_id = current_call_info.get('call_id')
                parent_id = current_call_info.get('parent_id')
                stack_depth = len(self.current_call_stack) - 1  # -1 because we're returning
                
                # Add return event
                self.debug_states.append({
                    'lineNumber': line_no,
                    'functionName': func_name,
                    'variables': {'return_value': return_value},
                    'callStack': list(self.current_call_stack),  # Copy before popping
                    'callId': call_id,
                    'parentId': parent_id,
                    'stackDepth': stack_depth,
                    'eventType': 'return',
                    'returnValue': return_value
                })
                
                # Now pop from call stack
                self.current_call_stack.pop()
                
        elif event == 'exception':
            exc_type, exc_value, exc_traceback = arg
            variables = {'exception_type': exc_type.__name__, 'exception_message': str(exc_value)}
            
            # Get current call info
            current_call_info = self.current_call_stack[-1] if self.current_call_stack else None
            call_id = current_call_info.get('call_id') if current_call_info else None
            parent_id = current_call_info.get('parent_id') if current_call_info else None
            stack_depth = len(self.current_call_stack)
            
            self.debug_states.append({
                'lineNumber': frame.f_lineno,
                'functionName': frame.f_code.co_name,
                'variables': variables,
                'callStack': list(self.current_call_stack),
                'callId': call_id,
                'parentId': parent_id,
                'stackDepth': stack_depth,
                'eventType': 'exception',
                'error': True
            })
        
        return self.trace_lines

def debug_python(code, input_data=None):
    """Debug Python code using sys.settrace"""
    
    complexity = analyze_complexity(code)
    # Save code to a temporary file
    with tempfile.NamedTemporaryFile('w', suffix='.py', delete=False) as temp_file:
        temp_file.write(code)
        temp_filename = temp_file.name

    # Capture stdout and stderr
    output_buffer = io.StringIO()
    error_buffer = io.StringIO()
    
    # Set up the tracer
    tracer = SimpleTracer()
    
    # Run the code with the tracer
    try:
        with redirect_stdout(output_buffer), redirect_stderr(error_buffer):
            # Prepare input if provided
            if input_data:
                sys.stdin = io.StringIO(input_data)
            
            # Set up the trace function
            sys.settrace(tracer.trace_calls)
            
            # Execute the code
            with open(temp_filename, 'r') as f:
                code_obj = compile(f.read(), temp_filename, 'exec')
                global_vars = {'__file__': temp_filename}
                exec(code_obj, global_vars)
            
            # Turn off tracing
            sys.settrace(None)
            
    except Exception as e:
        # Capture any exceptions
        error_msg = traceback.format_exc()
        print(f"Error executing code: {error_msg}")
        
        # Add the error state if it hasn't been added by the tracer
        if not tracer.debug_states or not tracer.debug_states[-1].get('error'):
            tracer.debug_states.append({
                'lineNumber': -1,
                'functionName': 'main',
                'variables': {'exception': str(e)},
                'callStack': [],
                'callId': None,
                'parentId': None,
                'stackDepth': 0,
                'eventType': 'exception',
                'error': True,
                'errorDetails': {
                    'type': type(e).__name__,
                    'message': str(e),
                    'traceback': error_msg
                }
            })
    finally:
        # Clean up
        import os
        os.unlink(temp_filename)
        sys.settrace(None)
        
        # Reset stdin if we modified it
        if input_data:
            sys.stdin = sys.__stdin__
    
    # Get the captured output
    output = output_buffer.getvalue()
    error = error_buffer.getvalue()
    
    # Add output to the last debug state
    if tracer.debug_states:
        tracer.debug_states[-1]['output'] = output
        if error:
            tracer.debug_states[-1]['error_output'] = error
    
    # Filter debug states to reduce noise
    filtered_states = filter_debug_states(tracer.debug_states)
    
    # Simplify states to only include essential information
    simplified_states = simplify_debug_states(filtered_states)
    
    # Add call hierarchy information
    result = {
        'debugStates': simplified_states,
        'callHierarchy': tracer.call_history
    }
    
    print(f"Debug completed - {len(simplified_states)} states")
    return result

def filter_debug_states(debug_states):
    """Filter debug states to reduce noise and focus on important states"""
    if len(debug_states) <= 10:  # If there are very few states, return them all
        return debug_states
    
    # Check if there's an error state
    has_error = any(state.get('error', False) for state in debug_states)
    
    if has_error:
        # For error cases, only keep the most relevant states
        filtered = []
        user_code_only = []
        
        # First, filter to only keep user code (not traceback/internal code)
        for state in debug_states:
            # Skip internal Python functions used for traceback
            if state['functionName'] in ['format_exc', 'format_exception', 'lazycache', 'checkcache']:
                continue
                
            # Skip Python machinery
            if state['functionName'].startswith('_') or state['functionName'] in ['<listcomp>', 'decode', '__init__']:
                continue
                
            # Keep user code states
            user_code_only.append(state)
        
        # For error cases, just take first few states and the error state
        for i, state in enumerate(user_code_only):
            # Keep the first few states of execution
            if i < 5:
                filtered.append(state)
            
            # Always keep error states
            if state.get('error', False):
                filtered.append(state)
        
        return filtered
    
    # For non-error cases, use normal filtering logic
    filtered = []
    prev_line = None
    prev_func = None
    prev_vars = {}
    prev_event_type = None
    
    for state in debug_states:
        line = state['lineNumber']
        func = state['functionName']
        event_type = state.get('eventType', 'step')
        vars_changed = has_vars_changed(prev_vars, state['variables'])
        
        # Always keep function entry/exit points and exception states
        keep_state = (
            event_type != prev_event_type or  # Event type changed
            event_type in ('return', 'exception') or  # Always keep returns and exceptions
            line != prev_line or  # Line number changed
            func != prev_func or  # Function changed
            vars_changed or  # Variables changed significantly
            state.get('error', False) or  # Error states
            len(filtered) == 0  # First state
        )
        
        if keep_state:
            filtered.append(state)
            prev_line = line
            prev_func = func
            prev_vars = state['variables'].copy()
            prev_event_type = event_type
    
    # Always include the last state
    if debug_states and (not filtered or filtered[-1] != debug_states[-1]):
        filtered.append(debug_states[-1])
        
    return filtered

def simplify_debug_states(debug_states):
    """Extract only essential information from debug states"""
    simplified = []
    
    # Remove duplicate error states (keep only the last one)
    error_funcs_seen = set()
    filtered_states = []
    
    for state in reversed(debug_states):
        # For error states, only keep one per function
        if state.get('error', False):
            if state['functionName'] not in error_funcs_seen:
                filtered_states.insert(0, state)
                error_funcs_seen.add(state['functionName'])
        else:
            filtered_states.insert(0, state)
    
    for state in filtered_states:
        # Skip internal Python machinery states
        if state['functionName'] in ['decode', '__init__', '__new__'] or state['functionName'].startswith('_'):
            continue
            
        # Create a simplified state with all necessary information for visualization
        simple_state = {
            'line': state['lineNumber'],
            'function': state['functionName'],
            'variables': clean_variables(state['variables']),
            'callId': state.get('callId'),
            'parentId': state.get('parentId'),
            'stackDepth': state.get('stackDepth', 0),
            'eventType': state.get('eventType', 'step')
        }
        
        # Add full call stack info with parent-child relationships
        if 'callStack' in state and state['callStack']:
            # Simplify callStack to contain only essential info
            simple_state['callStack'] = [{
                'function': call['function'],
                'line': call['line'],
                'call_id': call.get('call_id'),
                'parent_id': call.get('parent_id')
            } for call in state['callStack']]
        
        # Add return value if present
        if 'returnValue' in state:
            simple_state['returnValue'] = state['returnValue']
        
        # Add error information if present
        if state.get('error', False):
            simple_state['error'] = True
            if 'errorDetails' in state:
                simple_state['errorMessage'] = state['errorDetails']['message']
            elif 'exception_message' in state['variables']:
                simple_state['errorMessage'] = state['variables']['exception_message']
        
        # Add output only to the last state
        if 'output' in state and state['output']:
            simple_state['output'] = state['output']
        
        # Only add the state if it has useful information
        if simple_state['variables'] or state.get('error', False) or state.get('eventType') != 'step':
            simplified.append(simple_state)
    
    return simplified

def clean_variables(variables):
    """Clean variable values to make them simpler"""
    cleaned = {}
    
    for name, value in variables.items():
        # Skip Python internal variables
        if name.startswith('__') and name.endswith('__'):
            continue
            
        # Skip module and complex objects
        if isinstance(value, str) and ('module' in value or '<' in value and '>' in value):
            continue
            
        # Include exception info
        if name in ['exception_type', 'exception_message']:
            cleaned[name] = value
            continue
            
        # Keep only simple values
        cleaned[name] = value
        
    return cleaned

def has_vars_changed(prev_vars, current_vars):
    """Check if variables have changed in a meaningful way"""
    # Different number of variables
    if len(prev_vars) != len(current_vars):
        return True
        
    # Check for changes in values
    for key, value in current_vars.items():
        if key not in prev_vars or prev_vars[key] != value:
            return True
            
    return False

def analyze_complexity(code):
    """Analyze time and space complexity of Python code"""
    # Simple heuristic-based analysis
    complexity = {
        'time': 'O(1)',
        'space': 'O(1)',
        'has_recursion': False,
        'has_loops': False,
        'loop_details': []
    }
    
    try:
        # Check for recursion
        if 'def ' in code and '(' in code and ')' in code:
            # Simple check for recursive calls
            function_lines = [line for line in code.split('\n') if line.strip().startswith('def ')]
            for func_line in function_lines:
                func_name = func_line.split('def ')[1].split('(')[0].strip()
                if f"{func_name}(" in code.replace(func_line, ''):
                    complexity['has_recursion'] = True
                    complexity['time'] = 'O(2^n)'  # Default for recursion
                    complexity['space'] = 'O(n)'   # Default stack depth for recursion
        
        # Check for loops
        loops = ['for ', 'while ']
        loop_counts = {loop: code.count(loop) for loop in loops}
        total_loops = sum(loop_counts.values())
        
        if total_loops > 0:
            complexity['has_loops'] = True
            complexity['loop_details'] = []
            
            # Simple loop analysis
            if total_loops == 1:
                complexity['time'] = 'O(n)'
            elif total_loops == 2:
                complexity['time'] = 'O(n²)'
            else:
                complexity['time'] = f'O(n^{total_loops})'
                
            # Nested loop check
            lines = code.split('\n')
            indent_level = 0
            max_nesting = 0
            current_nesting = 0
            
            for line in lines:
                stripped = line.strip()
                if any(stripped.startswith(loop) for loop in loops):
                    current_nesting += 1
                    max_nesting = max(max_nesting, current_nesting)
                    complexity['loop_details'].append({
                        'type': 'for' if stripped.startswith('for') else 'while',
                        'line': line,
                        'nesting_level': current_nesting
                    })
                elif stripped.startswith('if ') or stripped.startswith('elif '):
                    # Not counting conditionals toward nesting for complexity
                    pass
                else:
                    # Reset nesting when we exit a block
                    if stripped and not stripped.startswith(' ') and not stripped.startswith('#'):
                        current_nesting = 0
            
            if max_nesting > 1:
                complexity['time'] = f'O(n^{max_nesting})'
                
    except Exception as e:
        print(f"Complexity analysis error: {str(e)}")
    
    return complexity