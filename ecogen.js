"use strict"


let repr = require("repr.js").repr;

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
    return `CHARACTER: char=${repr(this.chr)} row=${this.row} col=${this.col}`;
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


// "TJS" stands for "Tilde JS" and is a meta-language that is
// very similar to JS, but not quite. All lines in this meta-language
// must start with a tilde ("~").
const TOKEN_TJS_LINE = "TJS_LINE"
const TOKEN_TJS_EXPRESSION = "TJS_EXPRESSION"
const TOKEN_CHUNK = "CHUNK"

class Token {
  constructor() {
    this.type = null;
    this.text = "";
    this.row = 0;
    this.col= 0;
  }

  toString() {
    return `TOKEN type=${this.type}, text=${repr(this.text)}, row=${this.row}, col=${this.col}`;
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
        if (c.char === '~') {
          token.type = TOKEN_TJS_LINE;
          c = this.scanner.next();
          while (c.char === ' ') {
            c = this.scanner.next();
          }
        } else {
          token.type = TOKEN_TJS_CHUNK;
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


class Generator {
  constructor(lexer) {
    this.lexer = lexer;
  }

  gen() {
    let tokens = this.lexer.lex();
    let output = '';

    let Indenter = class {
      constructor() {
        this.value = 0;
        this.text = '';
      }

      increase() {
        this.value += 1;
        this.text = ' '.repeat(this.value * 4);
      }

      decrease() {
        this.value -= 1;
        this.text = ' '.repeat(this.value * 4);
      }
    };

    let indent = new Indenter();

    for (let token of tokens) {
      if (token.type === TOKEN_JS_CHUNK) {
        output += indent.txt + `_out(repr(${token.text}));\n`;
      }

      else if (token.type === TOKEN_JS_LINE) {
        if (token.text === "else") { indent.decrease(); }
        output += indent.text + token.text;
      }

      // TODO: Skipping COLON just like we did in the lexer.

      else if (token.type === TOKEN_JS_NEWLINE) {
        output += '\n'
      }

      else if (token.type === TOKEN_JS_BLOCK_END) {
        indent.decrease();
        if (indent.value < 0) {
          fatalError("Mismatched 'end' found.", token.row, token.col);
        }
      }

      else if (token.type === TOKEN_JS_EXPRESSION) {
        output += indent.text + `_out(${token.text});\n`;
      }
    }

    let prefix = "function _out(text) { _output_text += text; }";
    prefix += '\n';

    return prefix + output;
  }
}


class Runner {
  constructor(generator, env = {}) {
    this.generator = generator;
    this.env = env;
  }

  run() {
    let code = this.generator.gen();
    // console.log(code);

    this.env._output_text = '';
    eval(code);   // TODO: in this.env context!

    return this.env._output_text;
  }
}


function parse(source, env) {
  return new Runner(new Generator(new Lexer(new Scanner(source))), env).run();
}
