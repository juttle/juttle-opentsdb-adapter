# Juttle OpenTSDB Adapter

[![Build Status](https://travis-ci.org/juttle/juttle-opentsdb-adapter.svg?branch=master)](https://travis-ci.org/juttle/juttle-opentsdb-adapter)

OpenTSDB adapter for the [Juttle data flow
language](https://github.com/juttle/juttle), with read & write support.

## Examples

Read all `df.bytes.used` metric values from 30 minutes ago to now.
```juttle
read opentsdb -from :30 minutes ago: -name "df.bytes.used"
```

Add a `debug` option to return the final http query url:
```juttle
read opentsdb -debug true -from :30 minutes ago: -name "df.bytes.used"
```

Filter by tags:
```juttle
read opentsdb -debug true -from :30 minutes ago: -name "df.bytes.used" host = "test_host_name"
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
            "host": "hostname"
            "port": 1234
        }
    }
}
```

### Read options

Name | Type | Required | Description
-----|------|----------|-------------
`name` | string | yes | name of the metric to query
`debug` | boolean | no | output a query url corresponding to current set of options and filters
`from` | moment | yes | select points after this time (inclusive)
`to`   | moment | no | select points before this time (exclusive)

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
