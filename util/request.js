const axios = require('axios');
const StringHelper = require('./StringHelper');
const xml2js = require('xml2js').parseString;

function handleXml(data) {
  return new Promise((resolve, reject) => {
    const handleObj = (obj) => {
      Object.keys(obj).forEach((k) => {
        const v = obj[k];
        if ((typeof v).toLowerCase() === 'object' && v instanceof Array && v.length === 1) {
          obj[k] = v[0];
        }
        if ((typeof obj[k]).toLowerCase() === 'object') {
          handleObj(obj[k]);
        }
      })
    };

    xml2js(data, (err, result) => {
      handleObj(result);
      resolve(result);
    })
  })
}

module.exports = (req, res, {globalCookie} = {}) => {
  const userCookie = globalCookie ? globalCookie.userCookie() : {};
  return async (obj, opts = {}) => {
    try {
      if (typeof obj === 'string') {
        obj = {
          url: obj,
          data: {},
        }
      }
      obj.method = obj.method || 'get';

      const {url, data} = obj;

      if (obj.method === 'get') {
        obj.url = StringHelper.changeUrlQuery(data, url);
        delete obj.data;
      }

      obj.headers = obj.headers || {};
      obj.xsrfCookieName = 'XSRF-TOKEN';
      obj.withCredentials = true;
      obj.headers.Cookie = req.query.cookie || userCookie;
      obj.headers['User-Agent'] ??= 'Mozilla/5.0 (Windows; Windows NT 10.2; x64; en-US) AppleWebKit/534.30 (KHTML, like Gecko) Chrome/47.0.1158.277 Safari/601'

      const response = await axios(obj);

      if (opts.dataType === 'xml') {
        return handleXml(response.data.replace(/(<!--)|(-->)/g, ''));
      }

      if (opts.dataType === 'raw') {
        return response.data;
      }

      if (typeof response.data === 'string') {
        response.data = response.data.replace(/callback\(|MusicJsonCallback\(|jsonCallback\(|\)$/g, '');
        return JSON.parse(response.data);
      }

      return response.data;
    } catch (err) {
      res.send({
        result: 400,
        errMsg: `系统异常：${err.message}`,
      })
    }
  }
};