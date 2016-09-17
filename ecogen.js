"use strict"

// EcogenJS, inspired by Chris Anderson's "Elegant Code Generator (ecogen)":
// A simple code generator that provides a surprisingly versatile meta-programming capability.
//
// The meta-language used is called "Tilde JS". It's a language that is quite similar to JS, but
// not the same.
// TODO: Add language spec/definition.
// TODO: Add examples.


let localeval = require("localeval");

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
    str = str.replace(/\"/g, '\\"');
    str = str.replace(/\'/g, "\\'");

    return '\'' + str + '\'';
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


// "TJS" stands for "Tilde JS" and is a meta-language that is
// very similar to JS, but not quite. All lines in this meta-language
// must start with a tilde ("~").
const TOKEN_TJS_LINE = "TJS_LINE"
const TOKEN_TJS_EXPRESSION = "TJS_EXPRESSION"
const TOKEN_CHUNK = "CHUNK"

class Token {
  constructor() {
    this.type = TOKEN_CHUNK;
    this.text = "";
    this.row = 0;
    this.col= 0;
  }

  toString() {
    return `TOKEN type=${this.type}, text=${evalEscape(this.text)}, row=${this.row}, col=${this.col}`;
  }

  debugData() {
    return `// --- TJS line ${this.row + 1}`;
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

      if (token.type === TOKEN_CHUNK) {
        if (c.col === 0 && c.char === '~') {
          if (token.text.length > 0) {
            tokens.push(token);
          }
          token = new Token();
          token.type = TOKEN_TJS_LINE;
          token.row = c.row;
          token.col = c.col;

          // Skip over the '~'
          c = this.scanner.next();
          // Consume white space
          while (c.char === ' ' || c.char === '\t') {
            c = this.scanner.next();
          }
        }
        else if (c.char === '#' && this.scanner.peek() === '|') {
          tokens.push(token);
          token = new Token();
          token.type = TOKEN_TJS_EXPRESSION;
          token.row = c.row;
          token.col = c.col;

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
          token.text += '    ' + token.debugData() + '\n';
          tokens.push(token);
          token = new Token();
        } else {
          token.text += c.char;
        }
        c = this.scanner.next();
      }

      else if (token.type === TOKEN_TJS_EXPRESSION) {
        if (c.char === '|' && this.scanner.peek() === '#') {
          // We need to advance the scanner by one char at this point,
          // in order to skip the closing '#'
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
      if (token.type === TOKEN_CHUNK) {
        output += `_out(${evalEscape(token.text)});`;
      }

      else if (token.type === TOKEN_TJS_LINE) {
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

    localeval(code, this.context);

    // See evals above
    return this.context._output_text;
  }
}


function run(source, env) {
  return new Runner(new Generator(new Lexer(new Scanner(source))), env).run();
}



// node module exports
module.export = {
  Scanner,
  Lexer,
  Generator,
  Runner,
  run
}



// Test
if (process.argv[2] === 'test') {
  let scripts = [];

  scripts.push(
`
~for (let i = 0; i < 5; i++) {
  Problem #|i*i + i|# thing
~}`);

 scripts.push(
`
~for (let i = 0; i < 5; i++) {
  console.log("The value of i is:", #|i|#);
  console.log('Another time:', #|i|#);
~}`);

 scripts.push(
`
~// This is a TJS comment
~var i = 42;
~          let a = 5;
~let name = 'Shafik';
~let d = [1,2,3];
The value of d is: #|d.toString()|#
I think that #|new String("something")|# is the meaning of life.
Hello, my name is #|name|# and I am a person.
~for (let i = 0; i < a; i++) {
  loop index: #|i|#
~}
~ //thing: comment: ##
~
~let t = 7;
~if (t < 4) {
t is less than 4
~} else if (t > 6) {
t is greater than 6
~}
~else {
t is 4, 5, or 6
~}`);

  const expr="foo(baz(bar(3)))";
  scripts.push(
`
~let k = 4;
~function foo(x) { return x/k; }
~function bar(x) { return x*k; }
~function baz(x) { return x+k; }

Result of ${expr}: #|${expr}|#`);

  // scripts = scripts.slice(0, 1);
  // scripts = [scripts[2]];

  for (const script of scripts) {
    const s = new Scanner(script);
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

    console.log(new Runner(g, this).run());
    console.log("----------------------------------");
  }
}
