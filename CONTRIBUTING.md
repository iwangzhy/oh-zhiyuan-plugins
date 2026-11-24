# Contributing

## Report a bug

Include your macOS, Obsidian, and plugin versions, the steps to reproduce the issue, and the expected and actual results. [GitHub Issues](https://github.com/iwangzhy/oh-zhiyuan-plugins/issues)

## Submit a change

Make changes in `src/` and use the tests in `test/` to verify behavior. With Node.js 22 and npm, run the same build and tests as CI.

```sh
npm ci
npm test
```

For changes to the note header or terminal launch, load the built plugin in a test vault. Open notes from two different folders side by side, click each terminal button, and run `pwd` to check its working directory. [Manual installation](README.md#installation)

Open a pull request that explains the change and how you verified it. Include the TypeScript source and any tests for the change. The release bundle is generated from the source during the build.
