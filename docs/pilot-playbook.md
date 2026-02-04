# Pilot Playbook

## Overview

This playbook guides the first 1-3 doctors through the pilot phase of the AI Medical Secretary system. The goal is to validate the core workflows and gather feedback for improvements.

## Pilot Timeline

- **Week 1-2**: Setup & Basic Training
- **Week 3-4**: Active Usage with Support
- **Week 5-6**: Independent Usage & Feedback Collection

## Day 1: Onboarding

### Pre-Meeting Checklist
- [ ] Doctor has WhatsApp on their clinic phone
- [ ] Doctor has a laptop/computer for the dashboard
- [ ] Payment details ready (for Razorpay setup)

### Onboarding Meeting (30-45 minutes)

1. **Account Creation** (10 min)
   - Navigate to `/signup`
   - Complete the onboarding wizard
   - Verify profile information

2. **Dashboard Tour** (15 min)
   - Show 3-panel layout (Messages, EMR, Prescription)
   - Explain approval workflow
   - Demo the QA dashboard

3. **Safety Features Explanation** (10 min)
   - Emergency keyword detection
   - Approval mode settings
   - Audit logging

4. **WhatsApp Setup** (10 min)
   - Scan QR code for WhatsApp connection
   - Test with sample message

## Week 1: Supervised Usage

### Daily Check-ins
- 5-minute morning sync
- Review any issues from previous day
- Answer questions

### Key Activities
- [ ] First 5 patient messages received
- [ ] First 3 appointments scheduled
- [ ] First prescription sent
- [ ] First payment processed

### Support Protocol
- Respond within 30 minutes during clinic hours
- Log all issues in feedback system
- Document workarounds

## Week 2: Growing Independence

### Mid-pilot Review (30 min)
- Review usage statistics
- Discuss pain points
- Adjust settings if needed

### Key Metrics to Track
- Messages processed per day
- Average approval time
- Emergency detection accuracy
- Payment success rate

## Week 3-4: Active Usage

### Reduced Check-ins
- 15-minute weekly sync
- Available for questions via WhatsApp

### Focus Areas
- Edge cases and unusual scenarios
- Performance under higher volume
- Integration with existing workflows

## Week 5-6: Feedback & Evaluation

### NPS Survey
- Send Net Promoter Score survey
- Target: NPS > 50

### Exit Interview Questions
1. What worked well?
2. What was frustrating?
3. What features are missing?
4. Would you recommend to colleagues?
5. What would make you pay for this?

### Quantitative Metrics
- Messages handled: ___
- Time saved (estimated): ___
- Payments processed: ___
- Emergency detections: ___

## Common Issues & Resolutions

### "WhatsApp keeps disconnecting"
- Re-scan QR code
- Ensure stable internet
- Check if WhatsApp Web is open elsewhere

### "Patient says they didn't get the message"
- Check audit log for send status
- Verify phone number format (include country code)
- Check WhatsApp delivery status

### "Payment link expired"
- Generate new link with longer expiry
- Follow up with patient via call

### "Emergency not detected"
- Review message for keyword match
- Consider adding custom keywords
- Report for improvement

## Success Criteria

The pilot is successful if:
- [ ] Doctor can handle daily message volume without support
- [ ] 90%+ messages processed correctly
- [ ] Zero false-negative emergency detections
- [ ] NPS score > 50
- [ ] Doctor agrees to continue using the system

## Feedback Channels

1. **In-app Feedback Widget**: For quick bug reports and suggestions
2. **Weekly Sync Calls**: For detailed discussions
3. **NPS Survey**: For overall satisfaction
4. **WhatsApp Group**: For real-time support

## Escalation Path

1. **Level 1**: Check documentation
2. **Level 2**: Contact support via WhatsApp
3. **Level 3**: Video call with technical team
4. **Emergency**: Phone call to on-call engineer

## Post-Pilot Actions

1. Compile all feedback
2. Prioritize improvements
3. Plan next iteration
4. Expand to more doctors if successful
