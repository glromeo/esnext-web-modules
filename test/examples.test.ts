import {fail} from "assert";
import * as http from "http";
import {createServer} from "http-server";
import {Context} from "mocha";
import fetch from "node-fetch";
import { expect } from 'chai';

describe("examples", function () {

    let server: http.Server;

    before(function (this: Context, done) {
        server = createServer({
            root: __dirname + "/fixture",
            autoIndex: true,
            showDir: true
        });
        server.listen(8080, done);
    });

    after(function (this: Context, done) {
        server.close(error => error ? fail(error) : done());
    });

    it("lit-html", async function (this: Context) {
        let response = await fetch("http://127.0.0.1:8080/web_modules/lit-html/");
        if (!response.ok) {
            fail(response.statusText);
        }
        expect(await response.text()).to.match(/Hello lit-HTML World!/);
    });
});