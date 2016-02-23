'use strict';

/* global JuttleAdapterAPI */
let ASTVisitor = JuttleAdapterAPI.compiler.ASTVisitor;
let errors = JuttleAdapterAPI.errors;

class FilterOpenTSDBCompiler extends ASTVisitor {

    constructor(query) {
        super();
        this.query = query;
    }
    compile(node) {
        return this.visit(node, this.query);
    }
    visitExpressionFilterTerm(node, query) {
        return this.visit(node.expression, query);
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

        this.throwUnsupported();
    }
    visitUnaryExpression(node, query) {
        switch (node.operator) {
            case '*':
                return this.visit(node.expression, query);
            default:
                this.throwUnsupported();
        }
    }
    visitStringLiteral(node) {
        return String(node.value);
    }
    visitArrayLiteral(node) {
        this.throwUnsupported();
    }
    visitField(node) {
        return node.name;
    }
    throwUnsupported() {
        throw new errors.compileError('TYPE-ERROR', {
            message: "Only AND and '=' operators with string values are supported in the optimized filter expression."
        });
    }

}

module.exports = FilterOpenTSDBCompiler;
