const config = require('./mongo')

if (config.enableRestfulRequest) {
  process.__API__ = require('axios')
} else {
  const models = require('./model')
  process.__API__ = {
    get: function (target, { params: query }) {
      const modelName = target.split('/').slice(-1)
      const model = models[modelName]
      return new Promise((resolve, reject) => {
        queryModel(model, query).then(data => {
          resolve({ data })
        }) // mongoose uses mpromise who doesn't have a reject method here
      })
    }
  }
}

function queryModel (model, query) {
  let conditions = {}
  let select = {}
  if (query.conditions) {
    conditions = query.conditions
  }
  let builder = model.find(conditions)
  if (query.select) {
    select = query.select
    builder = builder.select(select)
  }

  ['limit', 'skip', 'sort', 'count'].forEach(key => {
    if (query[key]) {
      let arg = query[key]
      if (key === 'limit' || key === 'skip') {
        arg = parseInt(arg)
      }
      if (key === 'sort') {
        arg = { '_id': 'desc' }
      }
      if (key !== 'count') builder[key](arg)
      else builder[key]()
    }
  })
  return builder.exec()
}
