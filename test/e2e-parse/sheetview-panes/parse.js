"use strict";

module.exports = workbook => {
    return {
        sheet1: workbook.sheet(0).panes(),
        sheet2: workbook.sheet(1).panes(),
        sheet3: workbook.sheet(2).panes()
    };
};
