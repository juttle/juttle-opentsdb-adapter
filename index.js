/*
    OpenTSDB Adapter
*/
var db = require('./lib/db');

function OpentsdbAdapter(config) {
    db.init(config);

    return {
        name: 'opentsdb',
        read: require('./lib/read'),
    };
}
module.exports = OpentsdbAdapter;
