"use strict"
var sprintf = require("sprintf-js").sprintf;


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
        return sprintf("CHARACTER: char=%s row=%s col=%s",  this.chr, this.row, this.col);
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


class Token {
    constructor() {
        this.type = null;
        this.text = "";
        this.row = 0;
        this.col= 0;
    }

    toString() {
        return sprintf("TOKEN type=%s, text=%s, row=%s, col=%s", this.type, this.text, this.row, this.col);
    }
}
