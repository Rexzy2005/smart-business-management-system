/**
 * Email Utility
 * Handles sending emails using Nodemailer
 */

const nodemailer = require('nodemailer');
const logger = require('./logger');

/**
 * Create email transporter
 */
const createTransporter = () => {
  // For development - use Ethereal (fake SMTP)
  if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_HOST) {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'your-ethereal-user@ethereal.email',
        pass: 'your-ethereal-password'
      }
    });
  }

  // For production - use real SMTP
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

/**
 * Send email function
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content (optional)
 * @param {Array} options.attachments - Attachments (optional)
 */
exports.sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'Brillix'} <${process.env.EMAIL_FROM || 'noreply@brillix.com'}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
      attachments: options.attachments || []
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info(`Email sent to ${options.to}: ${info.messageId}`);

    // In development with Ethereal, log preview URL
    if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_HOST) {
      logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {
    logger.error('Email sending error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send low stock alert email
 */
exports.sendLowStockAlert = async (product, recipients) => {
  const subject = `⚠️ Low Stock Alert: ${product.name}`;

  const text = `
Low Stock Alert

Product: ${product.name}
Current Stock: ${product.quantityInStock} ${product.unitType}
Low Stock Threshold: ${product.lowStockThreshold}

Please restock this product as soon as possible.

Category: ${product.category}
SKU: ${product.sku || 'N/A'}
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <div style="background-color: #ff6b6b; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <h2 style="margin: 0;">⚠️ Low Stock Alert</h2>
      </div>
      
      <div style="padding: 20px;">
        <h3 style="color: #333; margin-bottom: 10px;">Product: ${product.name}</h3>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Current Stock:</td>
            <td style="padding: 10px; border: 1px solid #dee2e6; color: #ff6b6b; font-weight: bold;">
              ${product.quantityInStock} ${product.unitType}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Low Stock Threshold:</td>
            <td style="padding: 10px; border: 1px solid #dee2e6;">${product.lowStockThreshold}</td>
          </tr>
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Category:</td>
            <td style="padding: 10px; border: 1px solid #dee2e6;">${product.category}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">SKU:</td>
            <td style="padding: 10px; border: 1px solid #dee2e6;">${product.sku || 'N/A'}</td>
          </tr>
        </table>

        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;">
            <strong>Action Required:</strong> Please restock this product as soon as possible to avoid stockouts.
          </p>
        </div>
      </div>
      
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #dee2e6; margin-top: 20px;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          This is an automated alert from Brillix Inventory Management System
        </p>
      </div>
    </div>
  `;

  // Send to all recipients
  for (const recipient of recipients) {
    try {
      await exports.sendEmail({
        to: recipient.email,
        subject,
        text,
        html
      });
    } catch (error) {
      logger.error(`Failed to send low stock alert to ${recipient.email}:`, error);
    }
  }
};

/**
 * Send out of stock alert email
 */
exports.sendOutOfStockAlert = async (product, recipients) => {
  const subject = `🚨 OUT OF STOCK: ${product.name}`;

  const text = `
OUT OF STOCK ALERT

Product: ${product.name}
Current Stock: 0 ${product.unitType}

This product is now out of stock. Immediate restocking is required.

Category: ${product.category}
SKU: ${product.sku || 'N/A'}
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #dc3545; border-radius: 10px;">
      <div style="background-color: #dc3545; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <h2 style="margin: 0;">🚨 OUT OF STOCK ALERT</h2>
      </div>
      
      <div style="padding: 20px;">
        <h3 style="color: #333; margin-bottom: 10px;">Product: ${product.name}</h3>
        
        <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #721c24; font-size: 18px; font-weight: bold;">
            CURRENT STOCK: 0 ${product.unitType}
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Category:</td>
            <td style="padding: 10px; border: 1px solid #dee2e6;">${product.category}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">SKU:</td>
            <td style="padding: 10px; border: 1px solid #dee2e6;">${product.sku || 'N/A'}</td>
          </tr>
        </table>

        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;">
            <strong>URGENT ACTION REQUIRED:</strong> This product is completely out of stock. Immediate restocking is critical.
          </p>
        </div>
      </div>
      
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #dee2e6; margin-top: 20px;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          This is an automated alert from Brillix Inventory Management System
        </p>
      </div>
    </div>
  `;

  // Send to all recipients
  for (const recipient of recipients) {
    try {
      await exports.sendEmail({
        to: recipient.email,
        subject,
        text,
        html
      });
    } catch (error) {
      logger.error(`Failed to send out of stock alert to ${recipient.email}:`, error);
    }
  }
};

/**
 * Send sale confirmation email
 */
exports.sendSaleConfirmation = async (sale, recipient) => {
  const subject = `Sale Confirmation: ${sale.saleNumber}`;

  const itemsList = sale.items.map(item =>
    `${item.productName} - ${item.quantitySold} ${item.unitType} x ₦${item.unitPrice.toLocaleString()} = ₦${item.subtotal.toLocaleString()}`
  ).join('\n');

  const text = `
Sale Confirmation

Sale Number: ${sale.saleNumber}
Date: ${new Date(sale.date).toLocaleDateString()}

Items:
${itemsList}

Subtotal: ₦${sale.subtotal.toLocaleString()}
${sale.discount > 0 ? `Discount: -₦${sale.discount.toLocaleString()}` : ''}
${sale.tax > 0 ? `Tax: ₦${sale.tax.toLocaleString()}` : ''}
Total: ₦${sale.total.toLocaleString()}

Payment Method: ${sale.paymentMethod}
Payment Status: ${sale.paymentStatus}
${sale.amountPaid > 0 ? `Amount Paid: ₦${sale.amountPaid.toLocaleString()}` : ''}
${sale.amountDue > 0 ? `Amount Due: ₦${sale.amountDue.toLocaleString()}` : ''}

Thank you for your business!
  `;

  const itemsHtml = sale.items.map(item => `
    <tr>
      <td style="padding: 10px; border: 1px solid #dee2e6;">${item.productName}</td>
      <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center;">${item.quantitySold} ${item.unitType}</td>
      <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">₦${item.unitPrice.toLocaleString()}</td>
      <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right; font-weight: bold;">₦${item.subtotal.toLocaleString()}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <div style="background-color: #28a745; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; text-align: center;">
        <h2 style="margin: 0;">✅ Sale Confirmation</h2>
      </div>
      
      <div style="padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <p style="margin: 5px 0;"><strong>Sale Number:</strong> ${sale.saleNumber}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(sale.date).toLocaleDateString()}</p>
        </div>

        <h3 style="color: #333; margin-bottom: 15px;">Items Purchased:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Product</th>
              <th style="padding: 10px; border: 1px solid #dee2e6; text-align: center;">Quantity</th>
              <th style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">Price</th>
              <th style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="text-align: right; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
          <p style="margin: 5px 0;"><strong>Subtotal:</strong> ₦${sale.subtotal.toLocaleString()}</p>
          ${sale.discount > 0 ? `<p style="margin: 5px 0; color: #28a745;"><strong>Discount:</strong> -₦${sale.discount.toLocaleString()}</p>` : ''}
          ${sale.tax > 0 ? `<p style="margin: 5px 0;"><strong>Tax:</strong> ₦${sale.tax.toLocaleString()}</p>` : ''}
          <hr style="margin: 10px 0; border: none; border-top: 2px solid #dee2e6;">
          <p style="margin: 5px 0; font-size: 20px; color: #28a745;"><strong>Total:</strong> ₦${sale.total.toLocaleString()}</p>
        </div>

        <div style="margin-top: 20px; padding: 15px; background-color: #e7f3ff; border-left: 4px solid #007bff; border-radius: 5px;">
          <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${sale.paymentMethod.toUpperCase()}</p>
          <p style="margin: 5px 0;"><strong>Payment Status:</strong> <span style="color: ${sale.paymentStatus === 'paid' ? '#28a745' : '#ffc107'}; font-weight: bold;">${sale.paymentStatus.toUpperCase()}</span></p>
          ${sale.amountPaid > 0 ? `<p style="margin: 5px 0;"><strong>Amount Paid:</strong> ₦${sale.amountPaid.toLocaleString()}</p>` : ''}
          ${sale.amountDue > 0 ? `<p style="margin: 5px 0;"><strong>Amount Due:</strong> <span style="color: #dc3545; font-weight: bold;">₦${sale.amountDue.toLocaleString()}</span></p>` : ''}
        </div>
      </div>
      
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #dee2e6; margin-top: 20px;">
        <p style="color: #28a745; font-size: 16px; font-weight: bold; margin: 10px 0;">
          Thank you for your business!
        </p>
        <p style="color: #999; font-size: 12px; margin: 5px 0;">
          This is an automated confirmation from Brillix
        </p>
      </div>
    </div>
  `;

  return await exports.sendEmail({
    to: recipient.email,
    subject,
    text,
    html
  });
};

/**
 * Send daily sales summary email
 */
exports.sendDailySalesSummary = async (summary, recipients) => {
  const subject = `📊 Daily Sales Summary - ${new Date().toLocaleDateString()}`;

  const text = `
Daily Sales Summary
Date: ${new Date().toLocaleDateString()}

Total Sales: ${summary.totalSales}
Total Revenue: ₦${summary.totalRevenue.toLocaleString()}
Total Profit: ₦${summary.totalProfit.toLocaleString()}

Payment Status:
- Paid: ${summary.paidSales} sales
- Pending: ${summary.pendingSales} sales
- Amount Due: ₦${summary.totalAmountDue.toLocaleString()}

Top Products:
${summary.topProducts.map(p => `- ${p.name}: ${p.quantity} sold`).join('\n')}

Have a great day!
  `;

  const topProductsHtml = summary.topProducts.map(p => `
    <tr>
      <td style="padding: 8px; border: 1px solid #dee2e6;">${p.name}</td>
      <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">${p.quantity}</td>
      <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">₦${p.revenue.toLocaleString()}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; text-align: center;">
        <h2 style="margin: 0;">📊 Daily Sales Summary</h2>
        <p style="margin: 10px 0 0 0;">${new Date().toLocaleDateString()}</p>
      </div>
      
      <div style="padding: 20px;">
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px;">
          <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; text-align: center;">
            <p style="margin: 0; color: #155724; font-size: 14px;">Total Sales</p>
            <p style="margin: 10px 0 0 0; color: #155724; font-size: 24px; font-weight: bold;">${summary.totalSales}</p>
          </div>
          <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; text-align: center;">
            <p style="margin: 0; color: #0c5460; font-size: 14px;">Revenue</p>
            <p style="margin: 10px 0 0 0; color: #0c5460; font-size: 20px; font-weight: bold;">₦${summary.totalRevenue.toLocaleString()}</p>
          </div>
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; text-align: center;">
            <p style="margin: 0; color: #856404; font-size: 14px;">Profit</p>
            <p style="margin: 10px 0 0 0; color: #856404; font-size: 20px; font-weight: bold;">₦${summary.totalProfit.toLocaleString()}</p>
          </div>
        </div>

        <h3 style="color: #333; margin-bottom: 15px;">Payment Status</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 10px; border: 1px solid #dee2e6;">Paid Sales</td>
            <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right; font-weight: bold; color: #28a745;">${summary.paidSales}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #dee2e6;">Pending Sales</td>
            <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right; font-weight: bold; color: #ffc107;">${summary.pendingSales}</td>
          </tr>
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 10px; border: 1px solid #dee2e6;">Total Amount Due</td>
            <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right; font-weight: bold; color: #dc3545;">₦${summary.totalAmountDue.toLocaleString()}</td>
          </tr>
        </table>

        <h3 style="color: #333; margin-bottom: 15px;">Top Selling Products</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Product</th>
              <th style="padding: 10px; border: 1px solid #dee2e6; text-align: center;">Quantity</th>
              <th style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${topProductsHtml}
          </tbody>
        </table>
      </div>
      
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #dee2e6; margin-top: 20px;">
        <p style="color: #007bff; font-size: 16px; font-weight: bold; margin: 10px 0;">
          Keep up the great work! 🎉
        </p>
        <p style="color: #999; font-size: 12px; margin: 5px 0;">
          This is an automated summary from Brillix
        </p>
      </div>
    </div>
  `;

  // Send to all recipients
  for (const recipient of recipients) {
    try {
      await exports.sendEmail({
        to: recipient.email,
        subject,
        text,
        html
      });
    } catch (error) {
      logger.error(`Failed to send daily summary to ${recipient.email}:`, error);
    }
  }
};