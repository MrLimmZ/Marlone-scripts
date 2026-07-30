const esbuild = require("esbuild");

async function start() {
  const ctx = await esbuild.context({
    entryPoints: ["src/index.js"],
    bundle: true,
    minify: true,
    outfile: "main.js",
    target: ["es2018"],
    legalComments: "none",
  });

  if (process.argv.includes("--watch")) {
    await ctx.watch();
    console.log("Watching...");
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

start();