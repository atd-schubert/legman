"use strict";
require("../lib/legman.spec");

if (process.env.LEAKAGE_TEST) {
    require("../lib/legman.leakage");
}
