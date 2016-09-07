#!/usr/bin/env python
# coding: utf8
"""
Elegant Code Generator (ecogen)
"""

#TODO: when Runner runs and there is an error, need to trace back to original source code so we can tell user where the problem is

import sys

def fatal_error(msg, row, col):
    print "ERROR: " + msg
    print "ROW:", (row + 1)
    print "COL:", (col + 1)
    sys.exit(-1)


class Character:
    def __init__(self, char, row, col):
        self.char = char
        self.row = row
        self.col = col

    def __str__(self):
        return "CHARACTER: char=%s row=%s col=%s" % (repr(self.char), self.row, self.col)

class Scanner:
    def __init__(self, text):
        self.text = text
        self.row = 0
        self.col = 0
        self.index = 0

    def next(self):
        if self.index > len(self.text) - 1:
            return None
        c = Character(self.text[self.index], self.row, self.col)
        self.index += 1
        if c.char == '\n':
            self.row += 1
            self.col = 0
        else:
            self.col += 1
        return c


TOKEN_TYPE_PYTHON_LINE = "PYTHON_LINE"
TOKEN_TYPE_PYTHON_COLON = "PYTHON_COLON"
TOKEN_TYPE_PYTHON_NEWLINE = "PYTHON_NEWLINE"
TOKEN_TYPE_PYTHON_BLOCK_END = "PYTHON_BLOCK_END"
TOKEN_TYPE_PYTHON_EXPRESSION = "PYTHON_EXPRESSION"
TOKEN_TYPE_CHUNK = "CHUNK"

class Token:
    def __init__(self):
        self.type = None
        self.text = ''
        self.row = 0
        self.col = 0

    def __str__(self):
        return "TOKEN: type=%s text=%s row=%s col=%s" % (self.type, repr(self.text), self.row, self.col)

class Lexer:
    def __init__(self, scanner):
        self.scanner = scanner

    def lex(self):
        tokens = []
        token = Token()
        c = self.scanner.next()
        while c != None:
            #TODO: keep track of the last N values of (row,col), if it hasn't changed
            # in all of those times, we are probably 'stuck' so we should quit with internal error.

            #print c

            if token.type == None:
                if c.char == '$':
                    token.type = TOKEN_TYPE_PYTHON_LINE
                    c = self.scanner.next()
                    while c.char == ' ':
                        c = self.scanner.next()
                else:
                    token.type = TOKEN_TYPE_CHUNK
                token.row = c.row
                token.col = c.col

            elif token.type == TOKEN_TYPE_PYTHON_LINE:
                if c.char == '{':
                    if token.text == '':
                        token.type = TOKEN_TYPE_PYTHON_EXPRESSION
                    else:
                        token.text += c.char
                        #fatal_error("'{' found that does not follow immediately after a '$'", token.row, token.col) #TODO: better error message?

                elif c.char == '\n':
                    if token.text.strip().startswith('end'): #TODO: something a little more strict here?
                        token.type = TOKEN_TYPE_PYTHON_BLOCK_END
                        tokens.append(token)
                    else:
                        tokens.append(token)
                        token = Token()
                        token.type = TOKEN_TYPE_PYTHON_NEWLINE
                        token.text = '\n'
                        token.row = c.row
                        token.char = c.char
                        tokens.append(token)
                    token = Token()
                elif c.char == ':':
                    next_char = self.scanner.next()
                    if next_char.char == '\n':
                        tokens.append(token)

                        token = Token()
                        token.type = TOKEN_TYPE_PYTHON_COLON
                        token.text = ':'
                        token.row = c.row
                        token.col = c.col
                        tokens.append(token)

                        token = Token()
                        token.type = TOKEN_TYPE_PYTHON_NEWLINE
                        token.text = '\n'
                        token.row = next_char.row
                        token.char = next_char.char
                        tokens.append(token)

                        token = Token()
                    else:
                        token.text += c.char
                        token.text += next_char.char
                else:
                    token.text += c.char
                c = self.scanner.next()

            elif token.type == TOKEN_TYPE_PYTHON_EXPRESSION:
                if c.char == '}':
                    tokens.append(token)
                    token = Token()
                    c = self.scanner.next()
                else:
                    token.text += c.char
                    c = self.scanner.next()

            elif token.type == TOKEN_TYPE_CHUNK:
                if c.char == '$':
                    tokens.append(token)
                    token = Token()
                else:
                    token.text += c.char
                    c = self.scanner.next()

        if token.type != None:
            tokens.append(token)

        return tokens


class Generator():
    def __init__(self, lexer):
        self.lexer = lexer

    def gen(self):
        tokens = self.lexer.lex()
        output = ''

        class Indenter():
            def __init__(self):
                self.value = 0
                self.text = ''
            def increase(self):
                self.value += 1
                self.text = ' ' * self.value * 4
            def decrease(self):
                self.value -= 1
                self.text = ' ' * self.value * 4

        indent = Indenter()


        for token in tokens:
            #print token

            if token.type == TOKEN_TYPE_CHUNK:
                output += indent.text + '_out(%s)\n' % repr(token.text)

            elif token.type == TOKEN_TYPE_PYTHON_LINE:
                if token.text == "else" or token.text.startswith("elif "):
                    indent.decrease()
                output += indent.text + token.text

            elif token.type == TOKEN_TYPE_PYTHON_COLON:
                output += ':'
                indent.increase()

            elif token.type == TOKEN_TYPE_PYTHON_NEWLINE:
                output += '\n'

            elif token.type == TOKEN_TYPE_PYTHON_BLOCK_END:
                indent.decrease()
                if indent.value < 0:
                    fatal_error("Mismatched 'end' found.", token.row, token.col)

            elif token.type == TOKEN_TYPE_PYTHON_EXPRESSION:
                output += indent.text + '_out(%s)\n' % token.text



        prefix  = "def _out(text):\n"
        prefix += "    global _output_text\n"
        prefix += "    _output_text += text\n"
        prefix += "\n"
        return prefix + output


class Runner():
    def __init__(self, generator, env={}):
        self.generator = generator
        self.env = env

    def run(self):
        code = self.generator.gen()
        #print code  #TODO: have a way for user to turn this debug output on/off
        self.env['_output_text'] = ''
        exec code in self.env
        return self.env['_output_text']



def parse(source, env):
    return Runner(Generator(Lexer(Scanner(source))), env).run()


def main():
    input = """
$#TODO: this is a todo comment
$d = {1,2,3}
$       a = 0
$    if a == 0: a = 5
The value of d is: ${str(d)}
I think that ${str(i)} is the meaning of life.
Hello, my name is ${name} and I'm a person.
$ for i in range(a):
loop index: ${str(i)}
$  #thing: comment: {}
$end # commenty thing here
$
$t = 7
$if t < 4:
t is less than 4
$elif t > 6:
t is greater than 6
$else:
t is 4, 5 or 6
"""

    env = {}
    env['name'] = 'Chris'
    env['i'] = 42

    s = Scanner(input)
    l = Lexer(s)
    g = Generator(l)

    if 0:
        tokens = l.lex()
        for token in tokens:
            print token

    print Runner(g, env).run()


if __name__ == '__main__':
    main()


