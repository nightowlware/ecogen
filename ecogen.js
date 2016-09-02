"use strict"


function fatalError(msg, row, col) {
  console.error("ERROR: ", msg);
  console.error("ROW: ", row+1);
  console.error("COL: ", col+1);
  process.exit(-1);
}


class Character {
  constructor(chr, row, col) {
    this.chr = chr;
    this.row = row;
    this.col = col;
  }

  toString() {
    return `CHARACTER: char=${this.chr} row=${this.row} col=${this.col}`;
  }
}


class Scanner {
  constructor(text) {
    this.text = text;
    this.row = 0;
    this.col = 0;
    this.index = 0;
  }

  next() {
    if (this.index > text.length - 1) {
      return null;
    }

    let c = new Character(this.text[this.index], this.row, this.col);
    this.index++;
    if (c.chr == '\n') {
      this.row++;
      this.col = 0;
    }
    else { this.col++; }

    return c;
  }
}


TOKEN_JS_GENERIC = "JS_GENERIC"
TOKEN_JS_LINE = "JS_LINE"
TOKEN_JS_COLON = "JS_COLON"
TOKEN_JS_NEWLINE = "JS_NEWLINE"
TOKEN_JS_BLOCK_END = "JS_BLOCK_END"
TOKEN_JS_EXPRESSION = "JS_EXPRESSION"
TOKEN_JS_CHUNK = "CHUNK"

class Token {
  constructor() {
    this.type = null;
    this.text = "";
    this.row = 0;
    this.col= 0;
  }

  toString() {
    return `TOKEN type=${this.type}, text=${this.text}, row=${this.row}, col=${this.col}`;
  }
}


class Lexer {
  constructor() {
  }
}
