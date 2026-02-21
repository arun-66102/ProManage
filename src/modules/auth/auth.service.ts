import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../config/db';
import { env } from '../../config/env';
import { ApiError } from '../../utils/apiError';
import { LoginInput, RegisterInput } from './auth.schema';

const SALT_ROUNDS = 10;

// Helper: parse duration strings like "15m", "7d" into seconds
const parseDuration = (duration: string): number => {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15 minutes
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 3600;
        case 'd': return value * 86400;
        default: return 900;
    }
};

const generateAccessToken = (user: { id: number; email: string; role: string }) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        env.JWT_SECRET,
        { expiresIn: parseDuration(env.JWT_EXPIRES_IN) }
    );
};

const generateRefreshToken = (user: { id: number }) => {
    return jwt.sign(
        { id: user.id },
        env.JWT_REFRESH_SECRET,
        { expiresIn: parseDuration(env.JWT_REFRESH_EXPIRES_IN) }
    );
};

// ─── Register ────────────────────────────────────────────

export const register = async (data: RegisterInput) => {
    const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
    });

    if (existingUser) {
        throw ApiError.conflict('Email already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            passwordHash,
        },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token in DB
    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
    });

    return { user, accessToken, refreshToken };
};

// ─── Login ───────────────────────────────────────────────

export const login = async (data: LoginInput) => {
    const user = await prisma.user.findUnique({
        where: { email: data.email },
    });

    if (!user) {
        throw ApiError.unauthorized('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);

    if (!isMatch) {
        throw ApiError.unauthorized('Invalid email or password');
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
    });

    return {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
    };
};

// ─── Refresh Token ───────────────────────────────────────

export const refreshAccessToken = async (token: string) => {
    try {
        const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: number };

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
        });

        if (!user || user.refreshToken !== token) {
            throw ApiError.unauthorized('Invalid refresh token');
        }

        const accessToken = generateAccessToken(user);

        return { accessToken };
    } catch {
        throw ApiError.unauthorized('Invalid or expired refresh token');
    }
};

// ─── Logout ──────────────────────────────────────────────

export const logout = async (userId: number) => {
    await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
    });
};
