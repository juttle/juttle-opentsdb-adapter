# Juttle OpenTSDB Adapter

[![Build Status](https://travis-ci.org/juttle/juttle-opentsdb-adapter.svg?branch=master)](https://travis-ci.org/juttle/juttle-opentsdb-adapter)

[OpenTSDB](https://github.com/OpenTSDB/opentsdb/) adapter for the [Juttle data flow
language](https://github.com/juttle/juttle), with read & write support.

## Examples

Read all `df.bytes.used` metric values from 30 minutes ago to now.
```juttle
read opentsdb -from :30 minutes ago: name = "df.bytes.used"
```

Add a `debug` option to return the final http query url:
```juttle
read opentsdb -debug true -from :30 minutes ago: name = "df.bytes.used"
```

Filter by host tag:
```juttle
read opentsdb -from :30 minutes ago: name = "df.bytes.used" host = "test_host_name"
```

Write a test point:
```juttle
emit -points [ { time: '2016-01-01T01:01:01.111Z', name: 'test.test', value: 11, tag1: 'a_tag' } ] | write opentsdb
```

## Installation

Like Juttle itself, the adapter is installed as a npm package. Both Juttle and
the adapter need to be installed side-by-side:

```bash
$ npm install juttle
$ npm install juttle-opentsdb-adapter
```

## Configuration

The adapter needs to be registered and configured so that it can be used from
within Juttle. To do so, add the following to your `~/.juttle/config.json` file:

```json
{
    "adapters": {
        "opentsdb": {
            "host": "IP address",
            "port": 1234
        }
    }
}
```

### Read options

Name | Type | Required | Description
-----|------|----------|-------------
`debug` | boolean | no | output a query url corresponding to current set of options and filters
`from` | moment | yes | select points after this time (inclusive)
`to`   | moment | no | select points before this time (exclusive), defaults to `:now:`
`id`   | string | no | select the config instance to use

In addition to these options, `read opentsdb` supports a subset of standard Juttle
[read filters](http://juttle.github.io/juttle/concepts/filtering/), namely:
- `tagfield = 'value'`
- `tagfield = '*glob*'`
- combining the above filter expressions with `AND`

A metric name is required in the filter expression: `name = "df.bytes.used"`.

### Write options

Name | Type | Required | Description
-----|------|----------|-------------
`nameField` | string | no | the field that contains the metric name. Defaults to `name`.
`valueField` | string | no | the field that contains the metric value. Defaults to `value`.
`id`   | string | no | select the config instance to use

`write opentsdb`: the data points passed into it must contain fields:
- `name` (type: string)
- `value` (type: number)
- `time` (type: Juttle moment)
Optionally, the points can contain one or more tag fields (type: string).

### Optimizations

Whenever the opentsdb adapter can shape the entire Juttle flowgraph or its portion into an OpenTSDB query,
it will do so, sending the execution to OpenTSDB, so only the matching data will come back into Juttle runtime.
The portion of the program expressed in `read opentsdb` is always executed as an OpenTSDB query;
the downstream Juttle processors are currently not optimized, but may be in the future.

List of optimized operations:
- only filter expressions as part of `read opentsdb` (note: `read opentsdb ... | filter` is not optimized)

In case of unexpected behavior with optimized reads, add `-optimize false` option to `read opentsdb`
to disable optimizations, and kindly report the problem as a GitHub issue.

## Contributing

Contributions are welcome! Please file an issue or open a pull request.

To check code style and run unit tests:
```
npm test
```

Both are run automatically by Travis.

When developing you may run into failures during linting where jscs complains
about your coding style and an easy way to fix those files is to simply run
`jscs --fix test` or `jscs --fix lib` from the root directory of the project.
After jscs fixes things you should proceed to check that those changes are
reasonable as auto-fixing may not produce the nicest of looking code.
