import sys
import tempfile
import subprocess
import traceback
import json
import io
import uuid
import ast
from contextlib import redirect_stdout, redirect_stderr

class ComplexityAnalyzer(ast.NodeVisitor):
    def __init__(self):
        self.loops = []
        self.recursion_calls = set()
        self.function_calls = {}
        self.memoization = {}
        self.current_function = None
        self.loop_nesting = 0
        self.has_dp = False
        
    def visit_FunctionDef(self, node):
        prev_function = self.current_function
        self.current_function = node.name
        self.function_calls[node.name] = set()
        
        # Check for memoization decorator or dictionary usage
        for decorator in node.decorator_list:
            if isinstance(decorator, ast.Name) and decorator.id == 'lru_cache':
                self.has_dp = True
                self.memoization[node.name] = 'lru_cache'
                
        # Look for dictionary assignments that might be DP tables
        for item in node.body:
            if isinstance(item, ast.Assign):
                if isinstance(item.targets[0], ast.Name):
                    if isinstance(item.value, ast.Dict):
                        self.has_dp = True
                        self.memoization[node.name] = 'dict'
                    elif isinstance(item.value, ast.List):
                        self.has_dp = True
                        self.memoization[node.name] = 'list'
                        
        self.generic_visit(node)
        self.current_function = prev_function
        
    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            if self.current_function:
                self.function_calls[self.current_function].add(node.func.id)
                if node.func.id == self.current_function:
                    self.recursion_calls.add(self.current_function)
        self.generic_visit(node)
        
    def visit_For(self, node):
        self.loop_nesting += 1
        self.loops.append({
            'type': 'for',
            'nesting': self.loop_nesting,
            'lineno': node.lineno
        })
        self.generic_visit(node)
        self.loop_nesting -= 1
        
    def visit_While(self, node):
        self.loop_nesting += 1
        self.loops.append({
            'type': 'while',
            'nesting': self.loop_nesting,
            'lineno': node.lineno
        })
        self.generic_visit(node)
        self.loop_nesting -= 1

class DPTracer:
    def __init__(self):
        self.dp_tables = {}
        self.dp_updates = []
        self.current_table = None
        
    def track_assignment(self, frame, target, value):
        if isinstance(value, (dict, list)) and len(value) > 0:
            table_name = str(target)
            if table_name not in self.dp_tables:
                self.dp_tables[table_name] = {
                    'type': 'dict' if isinstance(value, dict) else 'list',
                    'dimensions': self._get_dimensions(value),
                    'values': value
                }
            self.dp_updates.append({
                'table': table_name,
                'value': value,
                'step': len(self.dp_updates)
            })
            
    def _get_dimensions(self, value):
        if isinstance(value, dict):
            return [len(value)]
        elif isinstance(value, list):
            dims = [len(value)]
            if dims[0] > 0 and isinstance(value[0], list):
                dims.append(len(value[0]))
            return dims
        return []

class SimpleTracer:
    def __init__(self):
        self.debug_states = []
        self.current_call_stack = []
        self.call_stack_ids = {}
        self.call_history = []
        self.line_execution_count = {}
        self.call_id_counter = 0
        self.dp_tracer = DPTracer()
        
    def trace_calls(self, frame, event, arg):
        if event == 'call':
            func_name = frame.f_code.co_name
            line_no = frame.f_lineno
            filename = frame.f_code.co_filename
            
            if '<frozen' in filename or '/lib/' in filename:
                return None
                
            self.call_id_counter += 1
            call_id = f"{func_name}_{self.call_id_counter}"
            
            parent_id = None
            if self.current_call_stack:
                parent_id = self.current_call_stack[-1].get('call_id')
            
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
            
            if parent_id:
                for call in self.call_history:
                    if call['call_id'] == parent_id:
                        call['children'].append(call_id)
                        break
                
        return self.trace_lines
        
    def trace_lines(self, frame, event, arg):
        if event == 'line':
            filename = frame.f_code.co_filename
            
            if '<frozen' in filename or '/lib/' in filename:
                return
                
            line_no = frame.f_lineno
            func_name = frame.f_code.co_name
            
            variables = {}
            for name, value in frame.f_locals.items():
                try:
                    if isinstance(value, (int, float, bool, str, type(None))):
                        variables[name] = value
                        # Track DP table updates
                        self.dp_tracer.track_assignment(frame, name, value)
                    elif hasattr(value, '__dict__'):
                        variables[name] = str(value)
                    else:
                        variables[name] = repr(value)
                except:
                    variables[name] = "Error: Unparseable value"
            
            current_call_info = self.current_call_stack[-1] if self.current_call_stack else None
            call_id = current_call_info.get('call_id') if current_call_info else None
            parent_id = current_call_info.get('parent_id') if current_call_info else None
            stack_depth = len(self.current_call_stack)
            
            call_stack = []
            for call in self.current_call_stack:
                call_stack.append({
                    'function': call['function'],
                    'line': call['line'],
                    'call_id': call['call_id'],
                    'parent_id': call['parent_id'],
                })
            
            debug_state = {
                'lineNumber': line_no,
                'functionName': func_name,
                'variables': variables,
                'callStack': call_stack,
                'callId': call_id,
                'parentId': parent_id,
                'stackDepth': stack_depth,
                'eventType': 'step'
            }
            
            # Add DP table state if available
            if self.dp_tracer.dp_tables:
                debug_state['dpTables'] = self.dp_tracer.dp_tables
                debug_state['dpUpdates'] = self.dp_tracer.dp_updates
            
            self.debug_states.append(debug_state)
            
            line_key = f"{filename}:{line_no}"
            self.line_execution_count[line_key] = self.line_execution_count.get(line_key, 0) + 1
            
        elif event == 'return':
            if self.current_call_stack:
                func_name = frame.f_code.co_name
                line_no = frame.f_lineno
                
                return_value = None
                if arg is not None:
                    try:
                        if isinstance(arg, (int, float, bool, str, type(None))):
                            return_value = arg
                        else:
                            return_value = repr(arg)
                    except:
                        return_value = "Error: Unparseable return value"
                
                current_call_info = self.current_call_stack[-1]
                call_id = current_call_info.get('call_id')
                parent_id = current_call_info.get('parent_id')
                stack_depth = len(self.current_call_stack) - 1
                
                debug_state = {
                    'lineNumber': line_no,
                    'functionName': func_name,
                    'variables': {'return_value': return_value},
                    'callStack': list(self.current_call_stack),
                    'callId': call_id,
                    'parentId': parent_id,
                    'stackDepth': stack_depth,
                    'eventType': 'return',
                    'returnValue': return_value
                }
                
                if self.dp_tracer.dp_tables:
                    debug_state['dpTables'] = self.dp_tracer.dp_tables
                    debug_state['dpUpdates'] = self.dp_tracer.dp_updates
                
                self.debug_states.append(debug_state)
                self.current_call_stack.pop()
                
        elif event == 'exception':
            exc_type, exc_value, exc_traceback = arg
            variables = {
                'exception_type': exc_type.__name__,
                'exception_message': str(exc_value)
            }
            
            current_call_info = self.current_call_stack[-1] if self.current_call_stack else None
            call_id = current_call_info.get('call_id') if current_call_info else None
            parent_id = current_call_info.get('parent_id') if current_call_info else None
            stack_depth = len(self.current_call_stack)
            
            debug_state = {
                'lineNumber': frame.f_lineno,
                'functionName': frame.f_code.co_name,
                'variables': variables,
                'callStack': list(self.current_call_stack),
                'callId': call_id,
                'parentId': parent_id,
                'stackDepth': stack_depth,
                'eventType': 'exception',
                'error': True
            }
            
            if self.dp_tracer.dp_tables:
                debug_state['dpTables'] = self.dp_tracer.dp_tables
                debug_state['dpUpdates'] = self.dp_tracer.dp_updates
            
            self.debug_states.append(debug_state)
        
        return self.trace_lines

def analyze_complexity(code):
    """Analyze time and space complexity of Python code"""
    try:
        tree = ast.parse(code)
        analyzer = ComplexityAnalyzer()
        analyzer.visit(tree)
        
        complexity = {
            'time': 'O(1)',
            'space': 'O(1)',
            'has_recursion': bool(analyzer.recursion_calls),
            'has_loops': bool(analyzer.loops),
            'has_dp': analyzer.has_dp,
            'loop_details': analyzer.loops,
            'memoization': analyzer.memoization
        }
        
        # Calculate actual complexity
        if analyzer.has_dp:
            # DP typically has polynomial time complexity
            dimensions = len(analyzer.loops)
            if dimensions == 1:
                complexity['time'] = 'O(n)'
                complexity['space'] = 'O(n)'
            elif dimensions == 2:
                complexity['time'] = 'O(n²)'
                complexity['space'] = 'O(n²)'
            else:
                complexity['time'] = f'O(n^{dimensions})'
                complexity['space'] = f'O(n^{dimensions})'
        elif analyzer.recursion_calls:
            # Check if it's exponential or has overlapping subproblems
            if any(call in analyzer.memoization for call in analyzer.recursion_calls):
                complexity['time'] = 'O(n)'  # Memoized recursion
                complexity['space'] = 'O(n)'
            else:
                branches = len(analyzer.recursion_calls)
                if branches > 1:
                    complexity['time'] = f'O({branches}^n)'
                    complexity['space'] = 'O(n)'
                else:
                    complexity['time'] = 'O(2^n)'
                    complexity['space'] = 'O(n)'
        elif analyzer.loops:
            max_nesting = max(loop['nesting'] for loop in analyzer.loops)
            if max_nesting > 1:
                complexity['time'] = f'O(n^{max_nesting})'
                complexity['space'] = 'O(n)'
            else:
                complexity['time'] = 'O(n)'
                complexity['space'] = 'O(1)'
        
        return complexity
        
    except Exception as e:
        print(f"Complexity analysis error: {str(e)}")
        return {
            'time': 'Unknown',
            'space': 'Unknown',
            'error': str(e)
        }

def debug_python(code, input_data=None):
    """Debug Python code using sys.settrace"""
    
    complexity = analyze_complexity(code)
    
    with tempfile.NamedTemporaryFile('w', suffix='.py', delete=False) as temp_file:
        temp_file.write(code)
        temp_filename = temp_file.name

    output_buffer = io.StringIO()
    error_buffer = io.StringIO()
    
    tracer = SimpleTracer()
    
    try:
        with redirect_stdout(output_buffer), redirect_stderr(error_buffer):
            if input_data:
                sys.stdin = io.StringIO(input_data)
            
            sys.settrace(tracer.trace_calls)
            
            with open(temp_filename, 'r') as f:
                code_obj = compile(f.read(), temp_filename, 'exec')
                global_vars = {'__file__': temp_filename}
                exec(code_obj, global_vars)
            
            sys.settrace(None)
            
    except Exception as e:
        error_msg = traceback.format_exc()
        print(f"Error executing code: {error_msg}")
        
        if not tracer.debug_states or not tracer.debug_states[-1].get('error'):
            error_state = {
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
            }
            if tracer.dp_tracer.dp_tables:
                error_state['dpTables'] = tracer.dp_tracer.dp_tables
                error_state['dpUpdates'] = tracer.dp_tracer.dp_updates
            tracer.debug_states.append(error_state)
    finally:
        import os
        os.unlink(temp_filename)
        sys.settrace(None)
        
        if input_data:
            sys.stdin = sys.__stdin__
    
    output = output_buffer.getvalue()
    error = error_buffer.getvalue()
    
    if tracer.debug_states:
        tracer.debug_states[-1]['output'] = output
        if error:
            tracer.debug_states[-1]['error_output'] = error
    
    filtered_states = filter_debug_states(tracer.debug_states)
    simplified_states = simplify_debug_states(filtered_states)
    
    result = {
        'debugStates': simplified_states,
        'callHierarchy': tracer.call_history,
        'complexity': complexity,
        'dpVisualization': bool(tracer.dp_tracer.dp_tables)
    }
    
    if tracer.dp_tracer.dp_tables:
        result['dpTables'] = tracer.dp_tracer.dp_tables
        result['dpUpdates'] = tracer.dp_tracer.dp_updates
    
    print(f"Debug completed - {len(simplified_states)} states")
    return result

# Rest of the helper functions remain unchanged

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