export async function validateAst(
  code: string, 
  astRules: any[] | undefined, 
  pyodide: any
): Promise<{ passed: boolean; errors: string[] }> {
  if (!pyodide || !astRules || astRules.length === 0) {
    console.log("🔍 AST validation skipped: no pyodide or astRules");
    return { passed: true, errors: [] };
  }

  console.log("🔍 Starting AST validation with:", { 
    code: code.substring(0, 100) + (code.length > 100 ? "..." : ""), 
    astRules 
  });

  try {
    // Convert JavaScript astRules to Python safely
    pyodide.globals.set("js_ast_rules", astRules);
    pyodide.globals.set("js_code", code);
    
    // Use Python's ast module to parse the code with better error handling
    const parseResult = pyodide.runPython(`
      import ast
      import json
      
      # Get the code and rules from JavaScript
      code = js_code
      ast_rules = js_ast_rules.to_py()
      
      validation_results = []
      
      try:
          # Parse the Python code into an AST
          tree = ast.parse(code)
          
          # Check each AST rule
          for rule in ast_rules:
              rule_name = rule.get('rule')
              rule_params = rule.get('params', {})
              
              if rule_name == 'has_function':
                  # Check if a specific function is defined
                  func_name = rule_params.get('name')
                  has_func = any(isinstance(node, ast.FunctionDef) and node.name == func_name 
                                for node in ast.walk(tree))
                  if not has_func:
                      validation_results.append(f"Missing required function: {func_name}")
                      
              elif rule_name == 'has_loop':
                  # Check if code contains a loop
                  has_loop = any(isinstance(node, (ast.For, ast.While)) for node in ast.walk(tree))
                  if not has_loop:
                      validation_results.append("Code should contain a loop (for or while)")
                      
              elif rule_name == 'has_conditional':
                  # Check if code contains an if statement
                  has_if = any(isinstance(node, ast.If) for node in ast.walk(tree))
                  if not has_if:
                      validation_results.append("Code should contain a conditional statement (if)")
                      
              elif rule_name == 'uses_variable':
                  # Check if a specific variable is used
                  var_name = rule_params.get('name')
                  has_var = any(isinstance(node, ast.Name) and node.id == var_name 
                               for node in ast.walk(tree))
                  if not has_var:
                      validation_results.append(f"Code should use variable: {var_name}")
          
          # Return validation results
          json.dumps(validation_results)
          
      except SyntaxError as e:
          json.dumps([f"Syntax error in code: {str(e)}"])
      except Exception as e:
          json.dumps([f"AST validation error: {str(e)}"])
    `);

    const errors = JSON.parse(parseResult);
    const passed = errors.length === 0;
    
    console.log("🔍 AST validation completed:", { passed, errors });
    return { passed, errors };
    
  } catch (error) {
    console.error("🚨 AST validation error:", error);
    return { 
      passed: false, 
      errors: [`AST validation failed: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}