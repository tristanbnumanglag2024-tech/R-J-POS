Continue the same **Retail POS and Back Office Management System** from Part 1.

Do NOT redesign or change the existing design system. Reuse the same typography, colors, spacing, buttons, cards, icons, inputs, tables, modals, status badges, and overall visual style from Part 1.

This part focuses on the **authentication screens and POS / Cashier application**.

This is a GENERAL RETAIL POS, NOT a restaurant POS.

# AUTHENTICATION

Create separate login experiences for the Back Office and POS.

## ADMIN / BACK OFFICE LOGIN

Create a professional admin login screen.

Include:

* Store logo
* System name
* Welcome message
* Email or Username
* Password
* Show / Hide Password
* Remember Me
* Forgot Password
* Login button

States:

* Default
* Invalid credentials
* Loading
* Successful login

After successful login, navigate to the existing Back Office Dashboard from Part 1.

## POS / CASHIER LOGIN

Create a separate POS login screen designed for a retail checkout terminal.

Include:

* Store logo
* Store name
* Register name
* Cashier login
* Employee selection or Employee ID
* PIN input
* Large numeric keypad

Numeric keypad:

1 2 3
4 5 6
7 8 9
Clear 0 Backspace

Buttons:

* Login
* Manager Login

States:

* Incorrect PIN
* Locked account
* Loading
* Successful login

After successful login, open the POS main screen.

# POS / CASHIER

Create a dedicated POS application separate from the Back Office.

The POS must be fast, simple, and touch-friendly.

## POS HEADER

Include:

* Store name
* Register name
* Cashier name
* Current date and time
* Customer
* Held Orders
* Menu
* Lock Screen

# PRODUCT CATALOG

Main area should display the product catalog.

Top controls:

* Product search
* Barcode scanner
* Category filter

Categories can include:

* All
* Clothing
* Electronics
* Grocery
* Beauty
* Hardware
* Other

Product cards should show:

* Product image
* Product name
* SKU
* Price
* Stock status

Clicking a product adds it to the current cart.

Allow searching by:

* Product name
* SKU
* Barcode

Show clear states for:

* In Stock
* Low Stock
* Out of Stock

# CART

Create a right-side shopping cart panel.

Show:

* Transaction number
* Customer
* Product image
* Product name
* Unit price
* Quantity
* Item discount
* Remove item

Quantity controls:

* Minus
* Quantity
* Plus

Cart totals:

* Subtotal
* Discount
* Tax
* Total

Actions:

* Add Customer
* Discount
* Hold
* Clear
* Pay

# CUSTOMER

Create a customer selection modal.

Search by:

* Customer name
* Phone
* Email

Display:

* Customer name
* Phone
* Email
* Loyalty points
* Purchase history

Actions:

* Select Customer
* Add New Customer
* Continue as Guest

# DISCOUNT

Create a discount modal.

Discount types:

* Percentage
* Fixed Amount
* Product Discount
* Order Discount

Show:

* Discount value
* Reason
* Authorized by

Include manager authorization when required.

# HOLD ORDER

Create a Held Orders modal/page.

Show:

* Transaction number
* Date and time
* Cashier
* Customer
* Items
* Total

Actions:

* Resume
* Delete

# PAYMENT

Create a dedicated payment screen after clicking Pay.

Display a large:

TOTAL DUE

Payment methods:

* Cash
* Credit Card
* Debit Card
* E-Wallet
* Bank Transfer
* Other

For Cash show:

* Amount Due
* Amount Received
* Change

Include a large numeric keypad and quick amount buttons:

* Exact Amount
* ₱100
* ₱500
* ₱1,000
* Custom Amount

Buttons:

* Back
* Cancel
* Complete Payment

# PAYMENT SUCCESS

After completing payment, show a success screen.

Display:

* Payment Successful
* Receipt Number
* Total
* Payment Method
* Amount Paid
* Change

Actions:

* Print Receipt
* Email Receipt
* New Sale

# RECEIPT

Create a receipt preview using the same receipt information defined in Part 1.

Include:

* Store logo
* Store name
* Address
* Contact information
* Receipt number
* Date and time
* Cashier
* Customer
* Products
* Quantity
* Price
* Discount
* Tax
* Total
* Payment method
* Amount paid
* Change

Actions:

* Print
* Email
* Reprint
* New Sale

# REFUND

Create a retail refund workflow.

Step 1:
Search for an existing receipt by receipt number or barcode.

Step 2:
Display the original transaction.

Step 3:
Allow the cashier to select products and refund quantities.

Show:

* Original quantity
* Refund quantity
* Original price
* Refund amount

Step 4:
Select refund method:

* Cash
* Original Payment Method

Step 5:
Show confirmation with manager authorization when required.

After completion show:

Refund Successful

# CASH MANAGEMENT

Create a POS cash management screen.

Functions:

* Open Register
* Starting Cash
* Cash In
* Cash Out
* Cash Drop
* Close Register

Opening register:

* Starting Cash
* Confirm

Cash In / Cash Out:

* Amount
* Reason
* Notes

Closing register:

* Opening Cash
* Cash Sales
* Cash In
* Cash Out
* Expected Cash
* Actual Cash
* Difference

# POS MENU

Create a simple POS menu containing:

* New Sale
* Held Orders
* Receipts
* Refund
* Cash Management
* Customers
* Lock Screen
* Settings
* Logout

# LOCK SCREEN

Create a POS lock screen showing:

* Store Name
* Register
* Current Cashier
* Register Locked
* Enter PIN

Reuse the same numeric keypad from the POS login.

Make all screens connected as a realistic prototype:

POS Login → POS → Product Selection → Cart → Customer/Discount → Payment → Payment Success → Receipt → New Sale

Also support:

POS → Held Orders
POS → Receipts → Refund
POS → Cash Management
POS → Lock Screen → PIN → POS

Keep everything visually consistent with Part 1.
