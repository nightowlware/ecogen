"use strict";
let ecogen = require('./ecogen');


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
~ //thing: comment: #||#
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
  const s = new ecogen.Scanner(script);
  const l = new ecogen.Lexer(s);
  const g = new ecogen.Generator(l);

  // Turn on to debug tokenizer
  if (false) {
    const tokens = l.lex();
    for (const token of tokens) {
      console.log("token: ", token);
      console.log("----------------------------------");
    }
  }

  console.log(new ecogen.Runner(g).run());
  console.log("----------------------------------");
}
