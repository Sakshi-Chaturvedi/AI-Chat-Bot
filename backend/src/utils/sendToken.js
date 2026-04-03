const sendToken = async (user, statusCode, res) => {
  // ! Generate tokens
  const accessToken = user.getAccessToken();
  const refreshToken = user.getRefreshToken();

  // ! Save refresh token in DB
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // ! Cookie options
  const baseOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "PRODUCTION",
    sameSite: "lax",
  };

  // ! Safe user data
  const safeUser = {
    _id: user._id,
    name: user.name,
    email: user.email,
  };

  // ! Send response
  res
    .status(statusCode)
    .cookie("accessToken", accessToken, {
      ...baseOptions,
      maxAge: 15 * 60 * 1000, // 15 min
    })
    .cookie("refreshToken", refreshToken, {
      ...baseOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })
    .json({
      success: true,
      user: safeUser,
    });
};

export default sendToken;