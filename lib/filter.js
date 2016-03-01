'use strict';

/* global JuttleAdapterAPI */
let StaticFilterCompiler = JuttleAdapterAPI.compiler.StaticFilterCompiler;
let errors = JuttleAdapterAPI.errors;

class FilterOpenTSDBCompiler extends StaticFilterCompiler {

    constructor(query) {
        super();
        this.query = query;
    }
    compile(node) {
        return this.visit(node, this.query);
    }
    visitBinaryExpression(node, query) {
        //XXX The latest stable release v2.1 does not support complex filter expressions:
        //  http://opentsdb.net/docs/build/html/user_guide/query/filters.html

        if (node.operator === 'AND') {
            this.visit(node.left, query);
            return this.visit(node.right, query);
        } else if (node.operator === '==') {
            return query.tags(this.visit(node.left), this.visit(node.right));
        }

        this.featureNotSupported();
    }
    visitStringLiteral(node) {
        return String(node.value);
    }
    visitField(node) {
        return node.name;
    }
    featureNotSupported() {
        throw new errors.compileError('TYPE-ERROR', {
            message: "Only AND and '=' operators with string values are supported in the optimized filter expression."
        });
    }

}

module.exports = FilterOpenTSDBCompiler;
