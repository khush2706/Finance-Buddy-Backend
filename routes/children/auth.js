const router = require('express').Router()
const Child = require('../../models/Child')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const { findChildByEmail } = require('../../controllers/childValidators')
const { verifyLogin, verifyRegistration } = require('../../controllers/commonValidators')

router.post('/register', async (req, res) => {
    //verifying if the registration data is according to the specifications
    const verificationError = verifyRegistration(req.body).error

    //send a status of 200 in case of wrong details
    if (verificationError) {
        return res.status(206).json({
            error: verificationError.details[0].message
        })
    }

    //checking if the email entered by the children is already present
    if (await findChildByEmail(req.body.email)) {
        return res.status(203).json({
            error: "Email already exists"
        })
    }

    //hasing the password submitted by children using bcrypt
    const salt = await bcrypt.genSalt(10)   //generating a random string
    const password = await bcrypt.hash(req.body.password, salt)

    //destructuring the children from the request
    const child = new Child({
        name: req.body.name,
        email: req.body.email,
        password
    })

    //trying to save the children data in MongoDB Atlas
    try {

        const savedChild = await child.save()
        res.status(201).json({
            id: savedChild._id
        })

    } catch (err) {
        res.status(503).json({
            error: err
        })
    }
})

router.post('/login', async (req, res) => {

    //checking for verification errors
    const verificationError = verifyLogin(req.body).error
    if (verificationError) {
        return res.status(206).json({
            error: verificationError.details[0].message
        })
    }

    //checking if the email entered by the child is already present
    if (!(await findChildByEmail(req.body.email))) {
        return res.status(203).json({
            error: "Email doesn't exist"
        })
    }

    const child = await Child.findOne({ email: req.body.email });

    // checking for password correctness
    const validPassword = await bcrypt.compare(req.body.password, child.password);

    if (!validPassword) {
        return res.status(201).json({
            error: "Incorrect Password"
        });
    }

    // create token by encypting the data
    //jwt contains - header + data + encryption info
    const token = jwt.sign(
        // payload data
        {
            name: child.name,
            email: child.email,
            parent: child.parent,
            recievedRequest: child.recievedRequest,
            assignedQuizzes: child.assignedQuizzes,
            assignedLessons: child.assignedLessons,
            quizHistory: child.quizHistory,
            lessonHistory: child.lessonHistory,
            id: child._id,
        },
        'hackwind'
    );

    //sending token as a header upon successful login
    res.header("auth-token", token).json({
        error: null,
        data: {
            token
        },
    });
})

module.exports = router