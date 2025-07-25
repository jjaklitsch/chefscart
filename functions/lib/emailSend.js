"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendConfirmationEmail = sendConfirmationEmail;
const firestore_1 = require("firebase-admin/firestore");
const mail_1 = __importDefault(require("@sendgrid/mail"));
const db = (0, firestore_1.getFirestore)();
// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
    mail_1.default.setApiKey(process.env.SENDGRID_API_KEY);
}
async function sendConfirmationEmail(req, res) {
    var _a, _b;
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        const { listId, email, planId } = req.body;
        if (!listId || !email || !planId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        console.log('Sending confirmation email for list:', listId);
        // Get Instacart list data
        const listDoc = await db.collection('instacartLists').doc(listId).get();
        if (!listDoc.exists) {
            return res.status(404).json({ error: 'Instacart list not found' });
        }
        const listData = listDoc.data();
        if (!listData) {
            return res.status(404).json({ error: 'List data not found' });
        }
        // Get meal plan data
        const planDoc = await db.collection('mealPlans').doc(planId).get();
        if (!planDoc.exists) {
            return res.status(404).json({ error: 'Meal plan not found' });
        }
        const planData = planDoc.data();
        if (!planData) {
            return res.status(404).json({ error: 'Plan data not found' });
        }
        // Create email content
        const emailHtml = createEmailTemplate({
            cartUrl: listData.shoppingListURL,
            listId,
            totalItems: listData.totalItems,
            matchedItems: ((_a = listData.matchedItems) === null || _a === void 0 ? void 0 : _a.length) || 0,
            outOfStockItems: listData.oosItems || [],
            recipes: planData.recipes || []
        });
        const emailData = {
            to: email,
            from: {
                email: process.env.SENDGRID_FROM_EMAIL || 'support@chefscart.ai',
                name: 'ChefsCart'
            },
            subject: '🛒 Your ChefsCart shopping list is ready!',
            html: emailHtml,
            text: createEmailText({
                cartUrl: listData.shoppingListURL,
                listId,
                totalItems: listData.totalItems,
                matchedItems: ((_b = listData.matchedItems) === null || _b === void 0 ? void 0 : _b.length) || 0
            })
        };
        // Send email via SendGrid
        if (process.env.SENDGRID_API_KEY) {
            await mail_1.default.send(emailData);
            console.log('Email sent successfully to:', email);
        }
        else {
            console.log('SendGrid not configured, email content:', emailHtml);
        }
        return res.status(200).json({
            success: true,
            message: 'Confirmation email sent successfully'
        });
    }
    catch (error) {
        console.error('Error sending confirmation email:', error);
        return res.status(500).json({
            error: 'Failed to send confirmation email',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
function createEmailTemplate(data) {
    const { cartUrl, listId, totalItems, matchedItems, outOfStockItems, recipes } = data;
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your ChefsCart Shopping List</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #ea580c; margin-bottom: 10px;">🧑‍🍳 ChefsCart</h1>
        <h2 style="color: #666; font-weight: normal;">Your shopping list is ready!</h2>
      </div>

      <div style="background: #f97316; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px 0;">🛒 Review & Edit Your Cart</h3>
        <a href="${cartUrl}" 
           style="background: white; color: #f97316; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Open in Instacart →
        </a>
      </div>

      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #374151;">📊 Shopping Summary</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="padding: 5px 0;">✅ <strong>${matchedItems} of ${totalItems}</strong> ingredients found</li>
          <li style="padding: 5px 0;">🍽️ <strong>${recipes.length}</strong> delicious recipes planned</li>
          ${outOfStockItems.length > 0 ?
        `<li style="padding: 5px 0;">⚠️ <strong>${outOfStockItems.length}</strong> items may need substitutes</li>`
        : ''}
        </ul>
      </div>

      ${recipes.length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #374151;">🍽️ This Week's Menu</h3>
          ${recipes.slice(0, 5).map(recipe => `
            <div style="border-left: 4px solid #f97316; padding-left: 15px; margin-bottom: 15px;">
              <h4 style="margin: 0 0 5px 0; color: #1f2937;">${recipe.title}</h4>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">${recipe.description}</p>
              <small style="color: #9ca3af;">⏱️ ${recipe.cookTime}min • 🍽️ ${recipe.servings} servings</small>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <h4 style="margin-top: 0; color: #92400e;">🆘 Need Help?</h4>
        <p style="margin-bottom: 10px; font-size: 14px;">
          <strong>Delivery or substitution issues?</strong><br>
          Use Instacart's Order Help with List ID: <code>${listId}</code>
        </p>
        <p style="margin: 0; font-size: 14px;">
          <strong>Want a fresh cart?</strong><br>
          Reply to this email with "regenerate" or visit ChefsCart to adjust preferences.
        </p>
      </div>

      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; margin-top: 30px;">
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          Happy cooking! 👨‍🍳<br>
          <strong>The ChefsCart Team</strong>
        </p>
      </div>

    </body>
    </html>
  `;
}
function createEmailText(data) {
    const { cartUrl, listId, totalItems, matchedItems } = data;
    return `
🧑‍🍳 ChefsCart - Your shopping list is ready!

🛒 REVIEW & EDIT YOUR CART
${cartUrl}

📊 SHOPPING SUMMARY
✅ ${matchedItems} of ${totalItems} ingredients found
🍽️ All recipes planned and ready to cook

🆘 NEED HELP?
Delivery issues? Use Instacart Order Help with List ID: ${listId}
Want changes? Reply with "regenerate" or visit ChefsCart

Happy cooking!
The ChefsCart Team
  `;
}
//# sourceMappingURL=emailSend.js.map