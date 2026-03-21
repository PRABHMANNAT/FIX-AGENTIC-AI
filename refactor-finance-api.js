const { Project, SyntaxKind } = require("ts-morph");
const path = require("path");

const project = new Project({
  tsConfigFilePath: path.join(__dirname, "tsconfig.json"),
});

const sourceFiles = project.getSourceFiles("src/app/api/finance/**/route.ts");

for (const sf of sourceFiles) {
  let changed = false;

  // 1. Ensure NextResponse is imported
  const nextServerImport = sf.getImportDeclaration(decl => decl.getModuleSpecifierValue() === "next/server");
  if (!nextServerImport) {
    sf.addImportDeclaration({
      moduleSpecifier: "next/server",
      namedImports: ["NextResponse"]
    });
    changed = true;
  } else {
    // Make sure NextResponse is in the named imports
    const hasNextResponse = nextServerImport.getNamedImports().some(ni => ni.getName() === "NextResponse");
    if (!hasNextResponse) {
      nextServerImport.addNamedImport("NextResponse");
      changed = true;
    }
  }

  // 2. Process GET, POST, etc.
  for (const func of sf.getFunctions()) {
    if (!func.isExported() || !["GET", "POST", "PUT", "DELETE", "PATCH"].includes(func.getName())) {
      continue;
    }

    // Set return type
    const returnType = func.getReturnTypeNode();
    if (!returnType || (returnType.getText() !== "Promise<NextResponse | Response>" && returnType.getText() !== "Promise<NextResponse>" && returnType.getText() !== "Promise<Response>")) {
      // In Next.js App Router, routes can return Response or NextResponse.
      // Often, the agent route returns a standard Response (streaming).
      func.setReturnType("Promise<NextResponse | Response>");
      changed = true;
    }

    // Wrap in try-catch if needed
    const body = func.getBody();
    if (body && body.getKind() === SyntaxKind.Block) {
      const statements = body.getStatements();
      
      // Check if it's already just a single try-catch
      const isWrapped = statements.length === 1 && statements[0].getKind() === SyntaxKind.TryStatement;
      
      if (!isWrapped) {
        // Wrap everything
        const allText = statements.map(s => s.getText()).join("\n");
        body.replaceWithText(`{\n  try {\n${allText}\n  } catch (error: any) {\n    console.error("API error:", error);\n    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });\n  }\n}`);
        changed = true;
      } else {
        // Inspect the catch block
        const tryStmt = statements[0];
        const catchClause = tryStmt.getCatchClause();
        if (catchClause) {
          const catchBlock = catchClause.getBlock();
          const catchText = catchBlock.getText();
          if (!catchText.includes("NextResponse.json") && !catchText.includes("new Response")) {
            catchBlock.replaceWithText(`{\n    console.error("API Error:", error);\n    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });\n  }`);
            changed = true;
          }
        }
      }
    }
  }

  // 3. Replace 'new Response(JSON.stringify(...))' with NextResponse.json
  const returnStmts = sf.getDescendantsOfKind(SyntaxKind.ReturnStatement);
  for (const rs of returnStmts) {
    const expr = rs.getExpression();
    if (expr && expr.getKind() === SyntaxKind.NewExpression) {
      const typeText = expr.getExpression().getText();
      if (typeText === "Response" || typeText === "globalThis.Response") {
        const args = expr.getArguments();
        if (args.length > 0) {
          const firstArg = args[0];
          // E.g. JSON.stringify({ error: ... })
          if (firstArg.getKind() === SyntaxKind.CallExpression && firstArg.getExpression().getText() === "JSON.stringify") {
            const innerArgs = firstArg.getArguments();
            if (innerArgs.length > 0) {
              const objText = innerArgs[0].getText();
              let initText = "";
              if (args.length > 1) {
                initText = ", " + args[1].getText();
              }
              rs.replaceWithText(`return NextResponse.json(${objText}${initText});`);
              changed = true;
            }
          }
        }
      }
    }
  }

  // 4. Check Supabase calls for missing error checking
  // Very simplistic: Look for 'const { data, error } = await supabase.something'
  const vrDecls = sf.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
  for (const vr of vrDecls) {
    const nameNode = vr.getNameNode();
    const init = vr.getInitializer();
    if (nameNode.getKind() === SyntaxKind.ObjectBindingPattern && init && init.getKind() === SyntaxKind.AwaitExpression) {
      const initText = init.getText();
      if (initText.includes("supabase.from")) {
        // ensure 'error' is in the binding
        const elements = nameNode.getElements();
        const hasError = elements.some(e => e.getNameNode().getText() === "error");
        
        if (hasError) {
          // Check if the next sibling statement is an 'if (error)' 
          // We can just rely on the TS checker or manual inspection. For now, we'll just log it 
          // and let me manually fix those.
        } else {
          // Add 'error' to the binding? It's easier to manually review the few that miss it.
        }
      }
    }
  }

  if (changed) {
    sf.saveSync();
    console.log("Refactored:", sf.getFilePath());
  }
}
console.log("AST Refactor complete");
