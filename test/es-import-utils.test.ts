import {bareNodeModule, isBare, parsePathname, toPosix} from "../src/es-import-utils";
import {expect} from "chai";

describe("ES Import Utils", function () {

    it("isBare", function () {
        expect(isBare("C:/Folder/file.txt")).to.be.false;
        expect(isBare("C:\\Folder\\file.txt")).to.be.false;
        expect(isBare(".")).to.be.false;
        expect(isBare("..")).to.be.false;
        expect(isBare("./")).to.be.false;
        expect(isBare("../")).to.be.false;
        expect(isBare(".a")).to.be.true;
        expect(isBare("..a")).to.be.true;
    });

    it("nodeModuleBareUrl", async function () {
        expect(bareNodeModule("anode_modules/abc/def")).to.equal("anode_modules/abc/def");
        expect(bareNodeModule("\\node_modulesque\\abc\\def")).to.equal("/node_modulesque/abc/def");
        expect(bareNodeModule(`C:\\esnext-server\\node_modules\\@babel\\core\\lib\\parse.js`)).to.equal("@babel/core/lib/parse.js");
        expect(bareNodeModule("/esnext-server/node_modules/@babel/core/lib/parse.js")).to.equal("@babel/core/lib/parse.js");
    });

    it("parsePathname", function () {
        expect(parsePathname("@module/name/path/file.ext")).to.eql([
            "@module/name",
            "path/file.ext"
        ]);
        expect(parsePathname("module/base/path/file.ext")).to.eql([
            "module",
            "base/path/file.ext"
        ]);
        expect(parsePathname("module.ext")).to.eql([
            "module.ext",
            null
        ]);
        expect(parsePathname("/path/file.ext")).to.eql([
            null,
            "/path/file.ext"
        ]);
        expect(parsePathname("./file.ext")).to.eql([
            null,
            "./file.ext"
        ]);
        expect(parsePathname("../file.ext")).to.eql([
            null,
            "../file.ext"
        ]);
        expect(parsePathname(".module/file.ext")).to.eql([
            ".module",
            "file.ext"
        ]);
        expect(parsePathname("@/path/file.ext")).to.eql([
            "@/path",
            "file.ext"
        ]);
    });

    it("toPosix", function () {
        expect(toPosix("C:\\Folder\\file.txt")).to.equal("C:/Folder/file.txt");
    });

});
