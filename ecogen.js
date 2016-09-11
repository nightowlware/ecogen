"use strict"

// EcogenJS, inspired by Chris Anderson's "Elegant Code Generator (ecogen)":
// A simple code generator that provides a surprisingly versatile meta-programming capability.
//
// The meta-language used is called "Tilde JS". It's a language that is quite similar to JS, but
// not technically the same.
// TODO: Add language spec/definition.
// TODO: Add examples.


let repr = require("repr.js").repr;

function fatalError(msg, row, col) {
  console.error("ERROR: ", msg);
  console.error("ROW: ", row+1);
  console.error("COL: ", col+1);
  process.exit(-1);
}


class Character {
  constructor(char, row, col) {
    this.char = char;
    this.row = row;
    this.col = col;
  }

  toString() {
    return `CHARACTER: char=${repr(this.char)} row=${this.row} col=${this.col}`;
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
    if (this.index > this.text.length - 1) {
      return null;
    }

    let c = new Character(this.text[this.index], this.row, this.col);
    this.index++;
    if (c.char == '\n') {
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
          token.type = TOKEN_CHUNK;
        }
        token.row = c.row;
        token.col = c.col;
      }

      else if (token.type === TOKEN_CHUNK) {
        if (c.char === '~') {
          tokens.push(token);
          token = new Token();
        } else {
          token.text += c.char;
          c = this.scanner.next();
        }
      }

      else if (token.type === TOKEN_TJS_LINE) {
        if (c.char === '{') {
          if (token.text === '') {
            token.type = TOKEN_TJS_EXPRESSION;
          } else {
            token.text += c.char;
          }
        }

        else if (c.char === '\n') {
            token.text += c.char;
            tokens.push(token);
            token = new Token();
        }

        else {
          token.text += c.char;
        }

        c = this.scanner.next();
      }

      else if (token.type === TOKEN_TJS_EXPRESSION) {
        if (c.char === '}') {
          tokens.push(token);
          token = new Token();
        } else {
          token.text += c.char;
        }
        c = this.scanner.next();
      }
    }

    if (token.type) {
      tokens.push(token);
    }

    return tokens;
  }
}


class Generator {
  constructor(lexer) {
    this.lexer = lexer;
  }

  gen() {
    let tokens = this.lexer.lex();
    let output = '';

    for (let token of tokens) {
      if (token.type === TOKEN_CHUNK) {
        output += `_out(repr(${token.text}));\n`;
      }

      else if (token.type === TOKEN_TJS_LINE) {
        output += token.text;
      }

      else if (token.type === TOKEN_TJS_NEWLINE) {
        output += '\n';
      }

      else if (token.type === TOKEN_TJS_EXPRESSION) {
        output += `_out(${token.text});\n`;
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

    // Turn on to debug generator
    if (true) {
      console.log(code);
    }

    this.env._output_text = '';
    eval(code);   // TODO: in this.env context!

    return this.env._output_text;
  }
}


function parse(source, env) {
  return new Runner(new Generator(new Lexer(new Scanner(source))), env).run();
}



// Test
if (process.argv[2] === 'test') {
  const input =
`~for (let i = 0; i < 10; i++) {
  console.log("test!");
 ~}`;

  let env = {};
  env.name = "Shafik"
  env.i = 42;

  const s = new Scanner(input);
  const l = new Lexer(s);
  const g = new Generator(l);

  // Turn on to debug tokenizer
  if (false) {
    const tokens = l.lex();
    for (const token of tokens) {
      console.log("token: ", token);
      console.log("----------------------------------");
    }
  }

  console.log(new Runner(g, env).run());
}
