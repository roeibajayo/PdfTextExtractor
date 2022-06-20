const fs = require("fs");

export const getPdfExtractorOptions = (debug) => {
  // default render callback
  function render_page(pageData) {
    //check documents https://mozilla.github.io/pdf.js/
    let render_options = {
      //replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
      normalizeWhitespace: false,
      //do not attempt to combine same line TextItem's. The default value is `false`.
      disableCombineTextItems: false,
    };

    return pageData.getTextContent(render_options).then(function (textContent) {
      const lines = [];
      const blocks = [];
      const items = [];
      for (let item of textContent.items.sort(
        (a, b) => a.transform[5] - b.transform[5]
      )) {
        if (item.str.trim() === "") continue;
        const str = {
          str: item.str,
          left: item.transform[4],
          top: item.transform[5] + item.transform[0],
          right: item.transform[4] + item.width,
          bottom: item.transform[5],
        };
        const line = lines.find((b) => Math.abs(b.bottom - str.bottom) < 2);
        if (line) {
          line.words.push(str);
        } else {
          lines.push({
            bottom: str.bottom,
            words: [str],
          });
        }
      }

      for (let l of lines.sort((a, b) => b.bottom - a.bottom)) {
        const sorted = l.words.sort((a, b) => b.right - a.right); //letters or words
        let lineTop = sorted[0].top;
        let lineBottom = sorted[0].bottom;
        let lineRight = sorted[0].right;
        let line = "";
        let word = [sorted[0].str];
        for (let i = 0; i < sorted.length; i++) {
          if (debug) items.push(sorted[i]);
          if (i > 0) {
            const offset = sorted[i - 1].left - sorted[i].right;
            if (debug) sorted[i].offset = offset;
            if (offset > 100) {
              //its new line
              const block = blocks.find(
                (b) =>
                  Math.abs(b.right - lineRight) < 2 &&
                  Math.abs(b.bottom - lineTop) < 20
              );
              if (block) {
                if (block.bottom > lineBottom) {
                  block.bottom = lineBottom;
                }
                block.lines.push(line);
              } else {
                blocks.push({
                  top: lineTop,
                  bottom: lineBottom,
                  right: lineRight,
                  lines: [line],
                });
              }

              lineTop = sorted[i].top;
              lineBottom = sorted[i].bottom;
              lineRight = sorted[i].right;
              line = "";
              word = [sorted[i].str];
            } else if (offset > 1.5) {
              //new word
              const currWord = word.join("");
              line +=
                " " +
                (currWord.match("[א-ת]") ? currWord : word.reverse().join(""));
              word = [sorted[i].str];
            } else {
              //same word
              word.push(sorted[i].str);
            }
          }
        }

        const currWord = word.join("");
        line +=
          " " + (currWord.match("[א-ת]") ? currWord : word.reverse().join(""));

        //its new line
        const block = blocks.find(
          (b) =>
            Math.abs(b.right - lineRight) < 2 &&
            Math.abs(b.bottom - lineTop) < 20
        );
        if (block) {
          if (block.bottom > lineBottom) {
            block.bottom = lineBottom;
          }
          block.lines.push(line);
        } else {
          blocks.push({
            top: lineTop,
            bottom: lineBottom,
            right: lineRight,
            lines: [line],
          });
        }
      }

      if (debug)
        fs.writeFileSync(
          `debug_${pageData.pageIndex}.txt`,
          JSON.stringify(items)
        );

      let txt = "";

      for (let block of blocks) {
        // txt += JSON.stringify(block) + "\r\n----------------------------\r\n";
        // continue;
        txt += block.lines.join("\r\n") + "\r\n" + "\r\n";
      }

      return txt + "#____END_OF_PAGE____#";
    });
  }

  return {
    pagerender: render_page,
  };
};
