require('dotenv').config({ path: __dirname + '/sample.env' });
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const dns = require('dns');


mongoose.connect(process.env['DB_URI'], { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on('error', err => { console.log('Could not connect to the database'); });

var Schema = mongoose.Schema;

const c_Schema = new Schema({
  name: {
    type: String,
    require: true,
  },
  count: {
    type: Number,
    require: true,
  }
});

const urlSchema = new Schema({
  url: {
    type: String,
    require: true,
  },
  shorturl: {
    type: Number,
    require: true,
  }
});

var Counter = mongoose.model('Counter', c_Schema);
var Url = mongoose.model('Url', urlSchema);


// var new_id = new Counter({ "name": "item_id", "count": 0 });
// new_id.save(function (err, doc) {
//   if (err) return err;
//   console.log(doc);
// })

async function getTheNewShroturl() {
  var result = await Counter.findOneAndUpdate({ name: "item_id" }, { $inc: { count: 1 } }, { new: true });
  return result.count;
}

// const bodyParser = require('body-parser');

app.use(express.urlencoded({ extended: false }));


// Basic Configuration
const port = process.env['PORT'] || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl', function (req, res) {
  var full_url = req.body.url;
  const regex = /(https?:[/][/])(www[.])?(?<dns>.*?)([/].*)?$/i;
  console.log(full_url.match(regex));
  try {
    var url = full_url.match(regex).groups.dns;
    dns.lookup(url, function (err, address, family) {
      if (err) {
        console.log(err);
        res.json({ "error": "Invalid url" });
      }
      else {
        Url.findOne({ "url": full_url }, function (err, doc) {
          if (doc) {
            res.json({ 'original_url': doc.url, 'short_url': doc.shorturl });
          }
          else {
            var shorturl;
            getTheNewShroturl().then((data) => shorturl = data).then(() => {
              var min_url = new Url({ "url": full_url, "shorturl": shorturl });
              min_url.save(function (err, doc) {
                if (err) return err;

              });
              res.json({ "original_url": full_url, "short_url": shorturl });
            });
          }
        });
      }
    });
  }
  catch (error) {
    res.json({ "error": "Invalid url" });
  }
});


app.get('/api/shorturl/:shorturl', function (req, res) {
  var shorturl = req.params.shorturl;
  Url.findOne({ "shorturl": shorturl }, function (err, doc) {
    if (err) return err;
    if (doc) {
      res.redirect(doc.url);
    }
    else {
      res.json({ "error": "Invalid url" });
    }
  });

});


app.listen(5000, function () {
  console.log(`Listening on port ${port}`);
});
