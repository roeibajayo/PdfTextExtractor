const pdf = require("pdf-parse");
const { stdout, exit } = require("process");
const { getPdfExtractorOptions } = require("./pdfTxtExtractor");
const { getFileFromStdin } = require("./stdinFileReader");

const debug = process.argv.includes("--debug");

async function processFile() {
  const content = await getFileFromStdin();
  const data = await pdf(content, getPdfExtractorOptions(debug));
  stdout.write(data.text);
  exit(1);
}

processFile();
