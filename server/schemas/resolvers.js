const { User, BubblyWater, Rating, Review } = require("../models");
const { signToken, AuthenticationError } = require("../utils/auth");
const { sendEmail } = require("../utils/sendEmail");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { triggerAsyncId } = require("async_hooks");
const saltRounds = 10;

const resolvers = {
  Query: {
    users: async () => {
      const users = await User.find();
      return users;
    },

    user: async (parent, { userId }) => {
      return User.findOne({ _id: userId });
    },
    me: async (parent, args, context) => {
      if (context.user) {
        return User.findOne({ _id: context.user._id });
      }
      throw AuthenticationError;
    },
  },

  Mutation: {
    addUser: async (parent, { username, email, password }) => {
      try {
        const emailVerificationToken = crypto.randomBytes(20).toString("hex");

        const user = await User.create({
          email,
          password,
          emailVerificationToken: emailVerificationToken,
          isVerified: false,
        });

        // const verificationUrl = `${process.env.WEBSITE_URL}/verifyEmail/${emailVerificationToken}`;
        // await sendEmail({
        //   to: email,
        //   subject: " Account Email Verification",
        //   text: `Please verify your email by clicking the following link: ${verificationUrl}`,
        // });
        const token = signToken({
          email: user.email,
          _id: user._id,
        });

        return { token, user };
      } catch (error) {
        console.error("Error adding user:", error);
        throw new Error("Failed to add user");
      }
    },

    verifyEmail: async (parent, { token, userId }, context) => {
      try {
        const user = await User.findOne({ emailVerificationToken: token });

        if (!user) {
          throw AuthenticationError;
        }
        if (user._id == userId) {
          user.isVerified = true;
          user.emailVerificationToken = null;
        }

        await user.save();

        return { user };
      } catch (error) {
        console.error("Error verifying email:", error);
        throw AuthenticationError;
      }
    },

    forgotPassword: async (parent, { email }) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          throw new Error("No user found with this email");
        }

        const resetToken = crypto.randomBytes(20).toString("hex");

        user.passwordResetToken = resetToken;
        user.passwordResetExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const resetUrl = `${process.env.WEBSITE_URL}/resetPassword/${resetToken}`;
        if (user) {
          await sendEmail({
            to: email,
            subject: "Password Reset",
            text: `Please reset your password by clicking the following link: ${resetUrl}`,
          });
          return true;
        } else {
          return;
        }
      } catch (error) {
        console.error("Error in forgot password:", error);
        throw new Error("Failed to process forgot password");
      }
    },

    resendEmailVerification: async (parent, { email }) => {
      const user = await User.findOne({ email });
      const emailVerificationToken = crypto.randomBytes(20).toString("hex");
      if (user) {
        user.emailVerificationToken = emailVerificationToken;
        const verificationUrl = `${process.env.WEBSITE_URL}/verifyEmail/${emailVerificationToken}`;
        await sendEmail({
          to: email,
          subject: "Account Email Verification",
          text: `Please verify your email by clicking the following link: ${verificationUrl}`,
        });
      }
      await user.save();
    },

    resetPassword: async (parent, { email, token, newPassword }) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          throw new Error("Invalid or expired token");
        }

        if (user.passwordResetToken === token) {
          user.password = newPassword;
          user.passwordResetToken = null;
          user.passwordResetExpires = null;
        } else {
          console.log("user.passwordResetToken and token do not match!");
          return;
        }
        await user.save();

        // const authToken = signToken(user);
        // return { token: authToken, user };
        return user;
      } catch (error) {
        console.error("Error resetting password:", error);
        throw new Error("Failed to reset password");
      }
    },
    removeUser: async (parent, { userId }) => {
      return User.findOneAndDelete({ _id: userId });
    },
    login: async (parent, { email, password }) => {
      const user = await User.findOne({ email });

      if (!user) {
        throw AuthenticationError;
      }

      const correctPw = await user.isCorrectPassword(password);

      if (!correctPw) {
        throw AuthenticationError;
      }

      const token = signToken(user);
      return { token, user };
    },
  },
};

module.exports = resolvers;
