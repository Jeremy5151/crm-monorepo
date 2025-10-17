# CRM Integration Templates

This repository contains integration templates for the CRM system.

## Available Templates

- **Trackbox** - Trackbox integration template for lead processing
- **ClickFunnels** - ClickFunnels integration template  
- **MailChimp** - MailChimp email marketing integration

## Usage

These templates are automatically synced with the CRM system. Users can install templates directly from the CRM interface.

## Template Structure

Each template contains:
- `config.json` - Template configuration with API endpoints, headers, and body structure
- Form fields definition for user input
- Variable mapping for lead data

## Security Note

This repository contains only template structures and placeholder values. No real API keys or sensitive data are stored here.

## Adding New Templates

1. Create a new folder for your template
2. Add `config.json` with the template configuration
3. Update `templates.json` to include the new template
4. Commit and push changes

The CRM will automatically detect new templates on the next sync.
