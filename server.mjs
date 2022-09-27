import express from 'express';
const app = express();
import { join } from 'path';
import hbs from 'hbs';
import bodyParser from 'body-parser'
import cookieParser  from "cookie-parser";
import session  from "express-session";
import morgan  from "morgan";

const port = process.env.PORT || 3000;

import './src/dbConn.mjs';
import userModel from './src/dbSchema.mjs';


app.use(morgan("dev"));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
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
    res.render("login");
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
        var username = req.body.username,
            password = req.body.password;

        try {
            var user = await userModel.findOne({ username: username }).exec();
            if (!user) {
                res.redirect("/login");
            }
            user.comparePassword(password, (error, match) => {
                if (!match) {
                    res.redirect("/login");
                }
            });
            req.session.user = user;
            res.redirect("/dashboard");

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
})
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
})
