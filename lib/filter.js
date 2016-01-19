module.exports = {
    initialize: function(options) {
        //XXX The latest stable release v2.1 does not support complex filter expressions:
        //  http://opentsdb.net/docs/build/html/user_guide/query/filters.html
        this.error = options.error('RT-TYPE-ERROR', {
            message: "Only AND and '=' operators with string values are supported in the optimized filter expression."
        });
        this.query = options.query;
    },
    compile: function(node) {
        return this.visit(node, this.query);
    },
    visitExpressionFilterTerm: function(node, query) {
        return this.visit(node.expression, query);
    },
    visitBinaryExpression: function(node, query) {
        if (node.operator === 'AND') {
            this.visit(node.left, query);
            return this.visit(node.right, query);
        } else if (node.operator === '==') {
            return query.tags(this.visit(node.left), this.visit(node.right));
        }

        throw this.error;
    },
    visitUnaryExpression: function(node, query) {
        switch (node.operator) {
            case '*':
                return this.visit(node.expression, query);
            default:
                throw this.error;
        }
    },
    visitStringLiteral: function(node) {
        return String(node.value);
    },
    visitArrayLiteral: function(node) {
        throw this.error;
    }
};
