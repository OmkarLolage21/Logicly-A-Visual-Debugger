// languages.js
export const supportedLanguages = [
    {
      id: 'python',
      name: 'Python',
      monacoLanguage: 'python',
      defaultCode: `def factorial(n):
      if n <= 1:
          return 1
      return n * factorial(n-1)
  
  print(factorial(5))`
    },
    {
      id: 'javascript',
      name: 'JavaScript',
      monacoLanguage: 'javascript',
      defaultCode: `function factorial(n) {
      if (n <= 1) return 1;
      return n * factorial(n - 1);
  }
  
  console.log(factorial(5));`
    }
  ];