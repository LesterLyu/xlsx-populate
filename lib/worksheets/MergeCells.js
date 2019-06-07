"use strict";

const {
    decodeRowRange, decodeColRange, encodeColRange, encodeRowRange, isInColRange, isInRowRange
} = require('../formula/Utils');

/**
 * A class stores merge cells.
 */
class MergeCells {
    /**
     * @param {Sheet} sheet - The sheet.
     * @param {{}} nodes - The mergeCells node.
     */
    constructor(sheet, nodes) {
        this._sheet = sheet;

        // helps faster query.
        this._data = new Map();
        this._position = { sheet: sheet.name() };
        this._addressCache = {};

        if (nodes) {
            nodes.children.forEach(node => {
                this.set(node.attributes.ref, node);
            });
        }
    }

    /**
     * Parse a reference, i.e. D19, A1:C9, Sheet2!A1, A:C, 1:6...
     * @param {string} address - The reference string to parse.
     * @return {{sheet: string, row: number, col: number}} The reference object.
     */
    parse(address) {
        let ref = this._addressCache[address];
        if (!ref) {
            ref = this._sheet.workbook()._parser.parseReference(address, this._position.sheet);
            this._addressCache[address] = ref;
        }
        return ref;
    }

    /**
     * Retrieve a mergeCell node.
     * @param {string} refString - The reference string to parse.
     * @return {{}|undefined} A hyperlink node.
     */
    get(refString) {
        if (this._data.size === 0) return;
        const ref = this.parse(refString);
        let curr;
        this._data.forEach((refRow, rowRange) => {
            const row = decodeRowRange(rowRange);
            if (!(row.from <= ref.row && ref.row <= row.to))
                return;
            refRow.forEach((node, colRange) => {
                const col = decodeColRange(colRange);
                if (col.from <= ref.col && ref.col <= col.to) {
                    // prefer range reference
                    if (row.from !== row.to || col.from !== col.to || !curr)
                        curr = node;
                }
            });
        });
        if (curr) return this.parse(curr.attributes.ref);
    }

    /**
     * Add mergeCell. If exists, replace it.
     * @param {string} refString - The reference string to add.
     * @param {{name, attributes, children}} mergeCell - The inner mergeCell node.
     * @return {undefined}
     */
    set(refString, mergeCell) {
        const ref = this.parse(refString);
        let rowRange, colRange;
        if (ref.from) {
            // ref is a range reference
            rowRange = encodeRowRange(ref.from.row, ref.to.row);
            colRange = encodeColRange(ref.from.col, ref.to.col);
        } else {
            // cell reference
            rowRange = encodeRowRange(ref.row, ref.row);
            colRange = encodeColRange(ref.col, ref.col);
        }

        // get row range
        let refRow = this._data.get(rowRange);
        if (!refRow) {
            refRow = new Map();
            this._data.set(rowRange, refRow);
        }
        refRow.set(colRange, mergeCell);
    }

    /**
     * Remove a mergeCell.
     * @param {string} refString - The reference you want to remove.
     * @return {undefined}
     */
    delete(refString) {
        const ref = this.parse(refString);
        this._data.forEach((refRow, rowRange) => {
            if (!isInRowRange(rowRange, ref.row))
                return;
            refRow.forEach((mergeCell, colRange) => {
                if (!isInColRange(colRange, ref.col))
                    return;
                rowRange.delete(colRange);
            });
            if (refRow.size === 0)
                this._data.delete(rowRange);
        });
    }

    /**
     * Return an xml form object.
     * @return {{}} Xml object.
     */
    toXml() {
        const node = {
            name: 'mergeCells',
            attributes: {},
            children: []
        };
        this._data.forEach(refRow => {
            refRow.forEach(mergeCell => {
                if (mergeCell != null)
                    node.children.push(mergeCell);
            });
        });
        node.children = [...new Set(node.children)];
        node.attributes.count = node.children.length;
        return node;
    }
}

module.exports = MergeCells;