import express from 'express';
const app = express();
import { join } from 'path';
import hbs from 'hbs';
import url from 'path'
import bodyParser from 'body-parser'
import cookieParser  from "cookie-parser";
import session  from "express-session";
import morgan  from "morgan";


import libre  from 'libreoffice-convert'

import fs  from 'fs'
import path  from 'path'

var outputFilePath;

import multer  from 'multer'

const port = process.env.PORT || 5500;

import './src/dbConn.mjs';
import userModel from './src/dbSchema.mjs';


app.use(morgan("dev"));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
    session({
        key: "user_sid",
        secret: "somerandonstuffs",
        resave: false,
        saveUninitialized: false,
        cookie: {
            expires: 600000,
        },
    })
);

app.use((req, res, next) => {
    if (req.cookies.user_sid && !req.session.user) {
        res.clearCookie("user_sid");
    }
    next();
});




app.set('views', join(process.cwd(), 'templates/views'));
hbs.registerPartials(join(process.cwd(), 'templates/partials'));
app.set('view engine', 'hbs');


app.use('/', express.static(join(process.cwd(), 'public')))
app.use(express.urlencoded({ extended: false }));
app.use(express.json());



// middleware function to check for logged-in users
let sessionChecker = (req, res, next) => {
    if (req.session.user && req.cookies.user_sid) {
        res.redirect("/dashboard");
    } else {
        next();
    }
};

// route for Home-Page
app.get("/", sessionChecker, (req, res) => {
    res.redirect("/login");
});



app
    .route("/signup")
    .get(sessionChecker, (req, res) => {
        res.render('signup');
    })
    .post((req, res) => {

        var user = new userModel({
            username: req.body.username,
            email: req.body.email,
            password: req.body.password,
        });
        user.save((err, docs) => {
            if (err) {
                res.redirect("/signup");
            } else {
                console.log(docs)
                req.session.user = docs;
                res.redirect("/dashboard");
            }
        });
    });


app
    .route("/login")
    .get(sessionChecker, (req, res) => {
        res.render('login');
    })
    .post(async (req, res) => {
        let username = req.body.username,
            password = req.body.password;

        try {
            var user = await userModel.findOne({ username: username }).exec();
            if (!user) {
                // res.redirect("/login");
                res.render('login',{msg: "Incorrect Username"})
                console.log("wrong username")
            }
            user.comparePassword(password, (error, match) => {
                if (!match) {
                    res.redirect("/login");
                    console.log("wrong password")

                }
            });
            req.session.user = user;
            res.redirect('/dashboard')
            console.log('SUCCESS')



        } catch (error) {
            console.log(error)
        }
    });




app
    .route("/databaselogin")
    .get(sessionChecker, (req, res) => {
        res.render('databaselogin');
    })
    .post(async (req, res) => {
      let uname = req.body.username;
            let password = req.body.password;

        try {
            var user1 = await userModel.findOne({ username: "admin" }).exec();
            if (!user1) {
                res.redirect("/databaselogin");

            }
            user1.comparePassword(password, (error, match) => {
                if (!match) {
                    res.redirect("/databaselogin");
                    console.log("wrong password")

                }
            });
            req.session.user = user1;
            res.redirect('/database')
            console.log('SUCCESS')



        } catch (error) {
            console.log(error)
        }
    });
// route for user's dashboard
app.get("/dashboard", (req, res) => {

    if (req.session.user && req.cookies.user_sid) {
        res.render("dashboard");
    } else {
        res.redirect("/login");
    }
});

// route for user logout
app.get("/logout", (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
        res.clearCookie("user_sid");
        res.redirect("/");
    } else {
        res.redirect("/login");
    }
});

app.get('/index',(req,res)=>{
    res.render('index')
});

app.get('/doctopdf',(req,res)=>{
    res.render('doctopdf')
})

app.get("/database", async (req, res) => {
        try {
            const result = await userModel.find()
            res.render('database', { data: result });
        } catch (error) {
            console.log(error);
        }

    })

// *************************************************************************************************

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + path.basename(file.originalname,path.extname(file.originalname)) + path.extname(file.originalname)
    );
  },
});


app.get('/pptxtopdf',(req,res) => {
  res.render('pptxtopdf')
})

const pptxtopdf = function (req, file, callback) {
  var ext = path.extname(file.originalname);
  console.log("file"+path.resolve(file))
  if (
    ext !== ".docx" &&
    ext !== ".doc"

  ) {
    return callback("This Extension is not supported");
  }
  callback(null, true);
};

const pptxtopdfupload = multer({storage:storage,fileFilter:pptxtopdf})


app.post('/pptxtopdf',pptxtopdfupload.single('file'),(req,res) => {
  if(req.file){
    console.log("filepath"+req.file.path)

    const file = fs.readFileSync(req.file.path);

    outputFilePath = Date.now() + "output.pdf"


    libre.convert(file,".pdf",undefined,(err,done) => {
      if(err){
        fs.unlinkSync(req.file.path)
        fs.unlinkSync(outputFilePath)

        res.send("some error taken place in conversion process")
      }

      fs.writeFileSync(outputFilePath, done);


      res.download(outputFilePath,(err) => {
        if(err){
          fs.unlinkSync(req.file.path)
        fs.unlinkSync(outputFilePath)

        res.send("some error taken place in downloading the file")
        }

        fs.unlinkSync(req.file.path)
        fs.unlinkSync(outputFilePath)
      })


    })
  }
})
 // *********************************************************************************

var storage1 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + path.basename(file.originalname,path.extname(file.originalname)) + path.extname(file.originalname)
    );
  },
});


app.get('/doctopdf',(req,res) => {
  res.render('doctopdf')
})

const docxtopdf = function (req,file, callback) {
  var ext = path.extname(file.originalname);
  if (

    ext !== ".docx" &&
    ext !== ".doc"

  ) {
    return callback("This Extension is not supported");
  }
  callback(null, true);
};

const docxtopdfupload = multer({storage:storage,fileFilter:docxtopdf})


app.post('/doctopdf',docxtopdfupload.single('file'),(req,res) => {
  if(req.file){
    console.log(req.file.path)

    const file = fs.readFileSync(req.file.path);

    outputFilePath = Date.now() + "output.pdf"


    libre.convert(file,".pdf",undefined,(err,done) => {
      if(err){
        fs.unlinkSync(req.file.path)
        fs.unlinkSync(outputFilePath)

        res.send("some error taken place in conversion process")
      }

      fs.writeFileSync(outputFilePath, done);


      res.download(outputFilePath,(err) => {
        if(err){
          fs.unlinkSync(req.file.path)
        fs.unlinkSync(outputFilePath)

        res.send("some error taken place in downloading the file")
        }

        fs.unlinkSync(req.file.path)
        fs.unlinkSync(outputFilePath)
      })


    })
  }
})
// **********************************************************************************


// *************************************************************************************************

var storage2 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + path.basename(file.originalname,path.extname(file.originalname)) + path.extname(file.originalname)
    );
  },
});


app.get('/sheetTopdf',(req,res) => {
  res.render('sheetTopdf')
})

const sheetTopdf = function (req, file, callback) {
  var ext = path.extname(file.originalname);
  if (
    ext !== ".docx" &&
    ext !== ".doc"

  ) {
    return callback("This Extension is not supported");
  }
  callback(null, true);
};

const sheetToPdfupload = multer({storage:storage,fileFilter:sheetTopdf})


app.post('/sheetTopdf',sheetToPdfupload.single('file'),(req,res) => {
  if(req.file){
    console.log(req.file.path)

    const file = fs.readFileSync(req.file.path);

    outputFilePath = Date.now() + "output.pdf"


    libre.convert(file,".pdf",undefined,(err,done) => {
      if(err){
        fs.unlinkSync(req.file.path)
        fs.unlinkSync(outputFilePath)

        res.send("some error taken place in conversion process")
      }

      fs.writeFileSync(outputFilePath, done);


      res.download(outputFilePath,(err) => {
        if(err){
          fs.unlinkSync(req.file.path)
        fs.unlinkSync(outputFilePath)

        res.send("some error taken place in downloading the file")
        }

        fs.unlinkSync(req.file.path)
        fs.unlinkSync(outputFilePath)
      })


    })
  }
})
 // *********************************************************************************




app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
})
