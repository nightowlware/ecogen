"use strict"

// EcogenJS, inspired by Chris Anderson's "Elegant Code Generator (ecogen)":
// A simple code generator that provides a surprisingly versatile meta-programming capability.
//
// The meta-language used is called "Tilde JS". It's a language that is quite similar to JS, but
// not the same.
// TODO: Add language spec/definition.
// TODO: Add examples.


const vm = require("vm");
const fs = require("fs");

function fatalError(msg, row, col) {
  console.error("ERROR: ", msg);
  console.error("ROW: ", row+1);
  console.error("COL: ", col+1);
  process.exit(-1);
}

// Attempts to escape str such that
// eval(evalEscape(str)) === str
// TODO: Needs more testing to make sure it covers all scenarios.
function evalEscape(str) {
    str = str.replace(/\n/g, '\\n');
    str = str.replace(/\r/g, '\\r');
    str = str.replace(/\"/g, '\\"');
    str = str.replace(/\'/g, "\\'");

    return '\'' + str + '\'';
}

// Windows users may be injecting some \r's so we strip them for code tokens:
function stripCarriageReturns(text) {
  return text.replace(/\r/g, '');
}


class Character {
  constructor(char, row, col) {
    this.char = char;
    this.row = row;
    this.col = col;
  }

  toString() {
    return `CHARACTER: char=${evalEscape(this.char)} row=${this.row} col=${this.col}`;
  }
}


class Scanner {
  constructor(text) {
    this.text = text;
    this.row = 0;
    this.col = 0;
    this.index = 0;
  }

  hasNext() {
    return !(this.index > this.text.length - 1);
  }

  next() {
    if (!this.hasNext()) {
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

  // Note: this returns a naked string, not a Character object
  peek() {
    return this.hasNext() ? this.text[this.index] : null;
  }
}


const TOKEN_TJS_LINE = "TJS_LINE";
const TOKEN_TJS_BLOCK = "TJS_BLOCK";
const TOKEN_TJS_EXPRESSION = "TJS_EXPRESSION";
const TOKEN_CHUNK = "CHUNK";

const TILDE_BLOCK_SYM = "~-";
const TILDE_LINE_SYM = TILDE_BLOCK_SYM[0];

class Token {
  constructor(type=TOKEN_CHUNK, text='', row=0, col=0) {
    this.type = type;
    this.text = text;
    this.row = row;
    this.col= col;
  }

  toString() {
    return `TOKEN type=${this.type}, text=${evalEscape(this.text)}, row=${this.row}, col=${this.col}`;
  }

  debugData() {
    if (this.type === TOKEN_TJS_BLOCK) {
      return `// --- TJS Block starting at ${this.row + 1}`;
    } else {
      return `// --- TJS line ${this.row + 1}`;
    }
  }
}


class Lexer {
  constructor(scanner) {
    this.scanner = scanner;
  }

  lex() {

    const consumeRestOfLine = () => {
      while (this.scanner.next().char !== '\n') { }
    };

    let tokens = [];
    let token = new Token();

    let c = this.scanner.next();

    while (c) {

      if (token.type === TOKEN_CHUNK) {
        if (c.col === 0 && c.char === TILDE_LINE_SYM) {
          if (this.scanner.peek() === TILDE_BLOCK_SYM[1]) {
            if (token.text.length > 0) {
              tokens.push(token);
            }
            token = new Token(TOKEN_TJS_BLOCK);
            consumeRestOfLine();
          } else {
            if (token.text.length > 0) {
              tokens.push(token);
            }
            token = new Token(TOKEN_TJS_LINE, '', c.row, c.col);
          }

          c = this.scanner.next();

          while (c.char === ' ' || c.char === '\t') {
            c = this.scanner.next();
          }
        }
        else if (c.char === '#' && this.scanner.peek() === '|') {
          tokens.push(token);
          token = new Token(TOKEN_TJS_EXPRESSION, '', c.row, c.col);

          // Skip over the '|'
          this.scanner.next();

          c = this.scanner.next();
        }
        else {
          if (token.text.length === 0) {
            token.row = c.row;
            token.col = c.col;
          }
          token.text += c.char;
          c = this.scanner.next();
        }
      }

      else if (token.type === TOKEN_TJS_LINE) {
        if (c.char === '\n') {
          token.text = stripCarriageReturns(token.text);
          token.text += '    ' + token.debugData() + '\n';
          tokens.push(token);
          token = new Token();
        } else {
          token.text += c.char;
        }
        c = this.scanner.next();
      }

      else if (token.type === TOKEN_TJS_BLOCK) {
        if (c.char === TILDE_BLOCK_SYM[0] && this.scanner.peek() === TILDE_BLOCK_SYM[1]) {
          token.text = stripCarriageReturns(token.text);
          token.text += '    ' + token.debugData() + '\n';
          tokens.push(token);
          token = new Token();
          consumeRestOfLine();
        } else {
          token.text += c.char;
        }
        c = this.scanner.next();
      }

      else if (token.type === TOKEN_TJS_EXPRESSION) {
        if (c.char === '|' && this.scanner.peek() === '#') {
          // Skip over the '#'
          this.scanner.next();
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
      // Uncomment following line to debug tokenizer output
      // console.log("token.type, token.text: ", `${token.type}, ${token.text}`);

      if (token.type === TOKEN_CHUNK) {
        output += `_out(${evalEscape(token.text)});`;
      }

      else if (token.type === TOKEN_TJS_LINE || token.type === TOKEN_TJS_BLOCK) {
        output += token.text;
      }

      else if (token.type === TOKEN_TJS_EXPRESSION) {
        output += `_out(${token.text});\n`;
      }
    }

    return output;
  }
}


class Runner {
  constructor(generator, context={}) {
    this.generator = generator;
    this.context = context;
    vm.createContext(this.context);
  }

  run() {
    let code = this.generator.gen();

    // Turn on to debug generator
    if (false) {
      console.log(code);
      console.log("------------------------------");
    }

    this.context._output_text = '';
    this.context._out = (text) => { this.context._output_text += text; };

    vm.runInContext(code, this.context);

    // See evals above
    return this.context._output_text;
  }
}


// Main entry point - runs the input template source code and returns
// the output result.
//
// src: string - the template source code to evaluate.
//
// env: object - a custom environment for the code to evaluate against. Note that
// the input env gets merged with a supplied "default context". See defaultContext below.
//
// opts: object - options argument for things like debug output, etc.
function run(src, env, opts={}) {
  const defaultContext = {
    require,
    ecogen: module.exports
  };

  // Merge input env with default env
  env = Object.assign(defaultContext, env);
  return new Runner(new Generator(new Lexer(new Scanner(src))), env).run();
}


// Same as the vanilla "run()", but using files for both the src and env.
// srcFile - filename of a TJS file to interpret
// envFile - filename of a json file to inject into the environment
function runFile(srcFile, envFile, opts) {
  const src = fs.readFileSync(srcFile, {encoding: "utf-8"});
  const env = envFile ? JSON.parse(fs.readFileSync(envFile)) : null;

  return run(src, env);
}


// node module exports
module.exports = {
  Scanner,
  Lexer,
  Generator,
  Runner,
  run,
  runFile
}
