const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv").config()
const Stripe = require('stripe')

const app = express()
app.use(cors())
app.use(express.json({ limit: "10mb" }))


const PORT = process.env.PORT || 8080
//mongodb connection
console.log(process.env.MONGODB_URL)
mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGODB_URL)
  .then(() => console.log("connected to databse"))
  .catch((err) => console.log(err))


//schema 
const userschema = mongoose.Schema({
  firstName: String,
  lastName: String,
  email: {
    type: String,
    unique: true,
  },
  password: String,
  confirmPassword: String,
  image: String,
})

//modal
const userModel = mongoose.model("user", userschema)


//api
app.get("/", (req, res) => {
  res.send("server is running")
})


//sign api

app.post('/signup', async (req, res) => {
  try {
    console.log(req.body)
    const { email } = req.body;

    // Check if a user with the provided email already exists
    const existingUser = await userModel.findOne({ email: email });

    if (existingUser) {
      return res.status(400).send({ message: "Email id is already registered", alert: false });
    } else {
      // Create a new user instance using the request body
      const newUser = new userModel(req.body);

      // Save the new user to the database
      await newUser.save();

      return res.status(201).send({ message: "Successfully signed up", alert: true });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error" });
  }
});

//api login

app.post("/login", async (req, res) => {
  try {
    const { email } = req.body;

    // Use async/await with findOne
    const result = await userModel.findOne({ email: email });

    if (result) {
      const dataSend = {
        _id: result._id,
        firstName: result.firstName,
        lastName: result.lastName,
        email: result.email,
        image: result.image,
      };
      console.log(dataSend);
      res.send({
        message: "Login is successfull",
        alert: true,
        data: dataSend,
      });
    } else {
      res.send({
        message: "Email is not available, please sign up",
        alert: false,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Internal server error",
      alert: false,
    });
  }
});

//product section
const schemaProduct = mongoose.Schema({
  name: String,
  category: String,
  image: String,
  price: String,
  description: String,
});
const productModel = mongoose.model("product", schemaProduct)


//save product in data 
app.post("/uploadProduct", async (req, res) => {
  //console.log(req.body)
  const data = await productModel(req.body)
  const datasave = await data.save()
  res.send({ message: "Upload successfully" })
})


//
app.get("/product", async (req, res) => {
  const data = await productModel.find({})
  res.send(JSON.stringify(data))
})



/*****payment getWay */
console.log(process.env.STRIPE_SECRET_KEY)


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

app.post("/create-checkout-session", async (req, res) => {

  try {
    const params = {
      submit_type: 'pay',
      mode: "payment",
      payment_method_types: ['card'],
      billing_address_collection: "auto",
      shipping_options: [{ shipping_rate: "shr_1NvKZfSAbw8COdC5tHkPBdTN" }],

      line_items: req.body.map((item) => {
        return {
          price_data: {
            currency: "inr",
            product_data: {
              name: item.name,
              // images : [item.image]
            },
            unit_amount: item.price * 100,
          },
          adjustable_quantity: {
            enabled: true,
            minimum: 1,
          },
          quantity: item.qty
        }
      }),

      success_url: `${process.env.FRONTEND_URL}/success`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,

    }


    const session = await stripe.checkout.sessions.create(params)
    // console.log(session)
    res.status(200).json(session.id)
  }
  catch (err) {
    res.status(err.statusCode || 500).json(err.message)
  }

})

//server is running 
app.listen(PORT, () => console.log("server is running at port : " + PORT))
