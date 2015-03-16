#amdreportjson
This is a simple task logging the content of all the layers constructed during this run.
Use can use this task to create your own logging task.

### amdreportjson (buildConfig)
Write a JSON file containing the list of included modules by layer. This task should be run last so everything else is done and the layers will not change.

#### Arguments
1. buildConfig _(String)_: Name of the property where the build configuration is stored. 

#### Task configuration
This task use its own configuration:

```
amdreportjson: {
	dir: "report/"
}
```

* `amdreportjson.dir` _(String)_: Directory in which the task will write the resulting file `buildReport.json`.

#### Results
Write a `buildReport.json` file.
