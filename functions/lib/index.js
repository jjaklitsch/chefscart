"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailSend = exports.createList = exports.gptPlan = void 0;
const app_1 = require("firebase-admin/app");
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const cors_1 = __importDefault(require("cors"));
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config();
// Initialize Firebase Admin
(0, app_1.initializeApp)();
// Set global options for all functions
(0, v2_1.setGlobalOptions)({
    maxInstances: 10,
    region: 'us-central1',
});
const corsHandler = (0, cors_1.default)({ origin: true });
// Import individual function modules
const gptPlan_1 = require("./gptPlan");
const createList_1 = require("./createList");
const emailSend_1 = require("./emailSend");
// Export the functions
exports.gptPlan = (0, https_1.onRequest)({
    timeoutSeconds: 30,
    memory: '1GiB',
}, (req, res) => corsHandler(req, res, () => (0, gptPlan_1.generateMealPlan)(req, res)));
exports.createList = (0, https_1.onRequest)({
    timeoutSeconds: 60,
    memory: '512MiB',
}, (req, res) => corsHandler(req, res, () => (0, createList_1.createInstacartList)(req, res)));
exports.emailSend = (0, https_1.onRequest)({
    timeoutSeconds: 10,
    memory: '256MiB',
}, (req, res) => corsHandler(req, res, () => (0, emailSend_1.sendConfirmationEmail)(req, res)));
//# sourceMappingURL=index.js.map