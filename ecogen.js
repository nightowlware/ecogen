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
  constructor(scanner) {
    this.scanner = scanner;
  }

  lex() {
    let tokens = [];
    let token = new Token();

    let c = this.scanner.next();

    while (c) {

      if (!token.type) {
        if (c.char === '$') {
          token.type = TOKEN_JS_LINE;
          c = this.scanner.next();
          while (c.char === ' ') {
            c = this.scanner.next();
          }
        } else {
          token.type = TOKEN_JS_CHUNK;
        }
        token.row = c.row;
        token.col = c.col;
      }

      else if (token.type === TOKEN_JS_CHUNK) {
        if (c.char === '$') {
          tokens.append(token);
          token = new Token();
          token.type = TOKEN_JS_GENERIC;
          token.text = c.char;
          token.row = c.row;
          token.col = c.col;
        } else {
          token.text += c.char;
        }
        c = this.scanner.next();
      }

      else if (token.type === TOKEN_JS_LINE) {
        if (c.char === '{') {
          if (token.text === '') {
            token.type = TOKEN_JS_EXPRESSION;
          } else {
            token.text += c.char;
          }
        }

        else if (c.char === '\n') {
          if (token.text.trim().startsWith('end')) {
            token.type = TOKEN_JS_BLOCK_END;
            tokens.append(token);
          } else {
            tokens.append(token);
            token = new Token();
            token.type = TOKEN_JS_NEWLINE;
            token.text = '\n'
            token.row = c.row;
            token.char = c.char;
            tokens.append(token);
          }
          token = new Token();
        }

        // TODO: Do we really need to deal with the ":" character here?
        // See python reference implementation.
        // else if (c.char === ':') {
        // }

        else {
          token.text += c.char;
        }

        c = this.scanner.next();
      }

      else if (token.type === TOKEN_JS_EXPRESSION) {
        if (c.char === '}') {
          tokens.append(token);
          token = new Token();
          c = this.scanner.next();
        } else {
          token.text += c.char;
          c = this.scanner.next();
        }
      }
    }

    if (token.type) {
      tokens.append(token);
    }
  }
}
