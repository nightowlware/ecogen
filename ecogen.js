"use strict"

// EcogenJS, inspired by Chris Anderson's "Elegant Code Generator (ecogen)":
// A simple code generator that provides a surprisingly versatile meta-programming capability.
//
// The meta-language used is called "Tilde JS". It's a language that is quite similar to JS, but
// not the same.
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
        if (c.char === '#') {
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
        if (c.char === '#') {
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
        const text = token.text.replace(/\n/g, "\\n");
        output += `_out(${repr(text)});`;
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
  constructor(generator) {
    this.generator = generator;
  }

  run() {
    let code = this.generator.gen();

    // Turn on to debug generator
    if (false) {
      console.log(code);
      console.log("------------------------------");
    }

    // TODO: It's unclear to me what context eval is evaling in here
    let geval = eval;
    geval("_output_text='';");
    geval("function _out(text) { _output_text += text; }");

    geval(code);

    // See evals above
    _output_text = _output_text.replace(/\\n/g, '\n');
    return _output_text;
  }
}


function parse(source, env) {
  return new Runner(new Generator(new Lexer(new Scanner(source))), env).run();
}



// Test
if (process.argv[2] === 'test') {
  const input =
`
~for (let i = 0; i < 5; i++) {
  console.log(~#i#);
  console.log('This is also a quoted string');
~}
`;

 const input2 =
`
~// This is a TJS comment
~var i = 42;
~          let a = 5;
~let name = 'Shafik';
~let d = [1,2,3];
The value of d is: ~#d.toString()#
I think that ~#new String(i)# is the meaning of life.
Hello, my name is ~#name# and I am a person.
~for (let i = 0; i < a; i++) {
  loop index: ~#i#
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
~}
`;

  const expr="foo(baz(bar(3)))";
  const input3 =
`
~function foo(x) { return x/4; }
~function bar(x) { return x*4; }
~function baz(x) { return x+4; }

Result of ${expr}: ~#${expr}#
`;

  const s = new Scanner(input3);
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
}
