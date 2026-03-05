import jwt from "jsonwebtoken";
export const protect = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error("JWT_SECRET is missing in environment variables");
        }
        const decoded = jwt.verify(token, secret);
        req.userId = decoded.id;
        next();
    }
    catch (err) {
        return res.status(401).json({ message: "Token expired" });
    }
};
