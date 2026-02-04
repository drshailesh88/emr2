ritical Product Decisions

  1. Should the assistant be allowed to send administrative replies (appointments, availability, reminders) without doctor approval?
  Yeah, so this is the fun part. Every doctor has a different workflow. Some of us like everything to be approved by us, and some of us like that things are done autonomously. I will just tell you the slot I have today, and you just do the bookings and appointments and availability things. I just tell you my calendar engagements, and you just create slots or manage slots by yourself. Different types of people have different requirements, so that is one thing that I would like you to know.
  2. Should the assistant be allowed to send clinical replies only after explicit doctor approval?
  Yeah, clinical replies only after doctor's approval.
  3. Do you want a “review queue” where all outgoing messages must be approved before sending?
  A blanket heading where we are sending all our messages would make this bot unusable. This would defeat the purpose of having the system. If I start to review each and every answer, which is going outside, this is absolutely going to defeat the purpose of having the system.
  4. Where should doctors review/approve messages: WhatsApp itself, a web dashboard, or both?
  So I would like to have an absolutely natural workflow like the bot or the system that I'm building is a person with a WhatsApp. It is doing a secretary's job, so it is almost like a human. So it should be WhatsApp things should be taken care of by WhatsApp itself.

  Doctor Workflow & Devices
  5. Do doctors prefer mobile‑first, desktop‑first, or both?
  Doctors While doing their MR, they would prefer something which is easy to use, and most of us are currently using browser-based systems for EMRs. HelpLix has come out with a system in which they are saying that they are mobile first. They are supporting their app, it is called Spot by HelpLix, and it is they say that they are mobile first. So both types of systems are being used, and people prefer EMR and other things happening over Chrome browser or browser-based app only. This is what I usually see.
  6. Do you want the assistant to sit on a separate WhatsApp number (clinic number) or the doctor’s personal number?
  Assistant sitting on a separate number would be a more human-like system. Sitting on doctor's personal number isn't a very pleasant experience to have for the doctor and for the patient. A clinic separate clinic number is a good call.
  7. Should there be a single shared inbox if you later add multiple doctors in the same clinic?
  We will think about this later. How are we going to manage multiple doctors in the same clinic? Most likely what I am thinking of is each doctor is going to have one separate WhatsApp number for himself.We are not building for multiple doctors in this version.

  Appointment Scheduling
  8. Do you want full scheduling logic (slots, capacity, buffers) or just “request → confirm with doctor”?
  Just confirming with the doctor that he is available or not is very easy, and it's not fun to have in your system. It is a request that we get, but it is not the end of the job. But people are not exactly looking for things that applications are asking for. Applications ask for buffers, capacity, and other things that you are also asking. But in India, what people are usually interested in is a time slot, and they want to know if the doctor is available in that time slot. They want to see the compatibility of the time doctor has with the time they have. So, this is how things happen. They are not interested in what kind of slots are available, what kind of buffers there is, what capacity there is. They are not interested in this. They just want to know if the slot is available or not. मेरे इतने बजे खाली हूं। डॉक्टर उस टाइम देख पाएंगे कि नहीं देख पाएंगे या डॉक्टर कितने बजे बैठते हैं। मैं उस टाइम पर मिल पाऊंगा कि नहीं मिल पाऊंगा।
  9. How do clinics currently track appointments: paper diary, Google Calendar, nothing?
  Most clinics do not track appointments at all. Some people in their setups usually do paper-pen thing. Some people use Practo, some people use HealthPlex. Nobody is using Google calendar and other things for appointment scheduling.
  10. Should patients be able to reschedule/cancel via WhatsApp?
Yeah, absolutely. Why not? I am thinking about a person living in the WhatsApp as my secretary. So if he is able to book my appointment, he should be able to reschedule it, he should be able to cancel it. This is what real human secretaries do.
  Prescription Workflow
  11. Who writes the prescription inside the system: doctor or assistant drafting for approval?
  There are two methods of writing it:
1. The doctor will write himself the prescription
2. The doctor will chat with the assistant, and the assistant will help in formatting of the prescription  What I mean to say by this is I will just tell that to my assistant, "The patient has a history of fever for 5 days, advised tablet paracetamol." My assistant will properly write it in the form of "Tablet paracetamol 650 mg, SOS or TDS," after discussing with me. Or maybe I have written it in a conversation, it will identify what the dosing has been and it will write it in properly formatted format. And nothing goes to the patient without doctor's approval and signature.
  12. Do you need digital signature or clinic stamp support in v1?
  I don't think we need such kinds of things in V1. We can keep it very simple. The doctor can put their… We can have some design templates in which it's almost like choosing the design of your letterhead. You can choose any design of the letterhead. You can put your credentials in that template, and the final prescription that would be coming out would be using that template.
  13. Do you want bilingual prescriptions (English + local language)?
  This is the minimum in the prescription. Some instructions are written with the drugs, and some people like that language to be written in their prescription, OD, BD, HS, before breakfast, before dinner. So these kinds of instructions we can have written in our patients' local language. For V1, we can have Hindi and English to start with. Later on, we can start adding other languages' support also. And I don't want this to be an LLM call. We can have it done by simpler methods as far as I understand. It doesn't have to be an LLM call for translation into local language.Or maybe it can be a local, it can be a LLM call for translation, I have not 100% fixed anything.

  Patient Records & Data
  14. Minimum required patient fields for v1 (name, age, phone, sex, diagnosis, meds, allergies, comorbidities)?
  These would obviously be there, and there would be columns like:
- History
- History of present illness
- General physical examination
- Systemic examination
- Investigations that I want patients to get done  I would like to chart the investigations that the patient has come up with, and I would like to write the treatment. So, these are the fields that I would like to have in my prescription.
  15. Should records be doctor‑specific or clinic‑wide by default?
  As I have said, I am not building for clinics. As of now, I am building for doctors, so there should be doctor-specific records.
  16. Do you want patients to be able to send documents directly to the assistant or only via doctor‑forwarded WhatsApp?
  I want the patient to have the experience of being able to talk to an assistant of the doctor.So the experience of sending the documents directly to the assistant seems more human-like.

  OCR & Document Intelligence
  17. Which documents are most common: lab reports, ECGs, imaging, discharge summaries?
  Lab reports are there, ECG is there. Sometimes, patients send their X-rays, but we can leave X-rays – we can just store X-rays in our record. We don't have to interpret the X-rays; that would involve machine learning. I don't want machine learning to come into this picture and complicate the things. But there should be a facility the way I am able to store these ECGs and X-rays. I don't want AI to interpret them for me, but I would like them. I would like AI to fetch them for me when I need to see the ECG and X-ray 5 years later, 3 years later, or 6 months later. Yes, patients send their discharge summaries, patient send their prescriptions from previous doctors, so these are the other documents that are incoming.
  18. Are the documents mostly in English, or do we need Hindi/other languages in OCR from day one?
Documents are mostly in English.
  Safety & Escalation
  19. What are your top 10 emergency keywords/symptoms for cardiology triage?
  In cardiology, the emergency keywords are limited, the words are chest pain, chest discomfort, shortness of breath and its various synonyms, very high blood pressure, syncope, transient loss of consciousness, unresponsiveness/ cardiac arrest And its various synonyms.
  20. What should the assistant say to a patient when it flags an emergency?
it should provide the number for coordinating with the ambulance or maybe simply say a template maybe simply push a template message or something like that that please report to the emergency. We can customize it per doctor. Each doctor can have its own ambulance number coordinated with the hospital. Or, we can customize it for different doctors. Different doctors want to give different kinds of messages for patients in emergency situations. Those messages can be incorporated and made at our template can be made according to their requirements. or maybe we can have we can let LLM have a free swing at that we can at the time of configuration or initial setup we can just take the emergency contact number or emergency ambulance number or hospital appointment number and the LLM can send out a message that I feel like this is important emergency and you should reach to the hospital and contact this number for coordinating for an ambulance
  Payments
  21. Should payments be collected before appointment confirmation?
  I would describe how what usually happens when we talk to the assistant or secretary he or she usually sends a link when the payment is received on that link the Secretary confirms the appointment that you can come on this appointment at this lot or when we take some paid appointments somewhere we choose a slot for example somebody is one wants to talk to me at a particular time slot on my teleconsultation using health clicks what he does is he chooses the time slot and clicks on that time slot and for booking he's offered a payment link so after the clicking that payment link he pays me through UPI and that's how appointment is booked so I would not like a new thing coming into this picture I would like the same experience to be carried over to my system also
  22. Do you want UPI links and automated receipts?
  That seems like an important function to have. Yes, appointment coordination means that receipts are generated and UPI links are displayed for UPI payment. Payment is accepted by UPI or other methods. So that would mandate these features.

  Compliance & Consent
  23. Do you want explicit patient consent text (e.g., “You are chatting with an AI secretary”)?
  Honestly, I don't want that. It can be left up to the doctor, or we can leave it up to the decision of the doctor who is using the system. But I would not like my patients to know that they are not talking to a real doctor, they are talking to somebody who is not in the game.
  24. Should patients be able to request deletion of their data?
  Yeah, but that request cannot come to the assistant. That request has to go to the doctor. The doctor can delete the patient's record. Having the possibility that the patient can ask the bot or app to delete their data lets the possibility of prompt injection come into the picture. If I leave the scope of similar things, that would increase the possibility that incoming messages can have more serious types of requests. This could increase susceptibility and security risk associated with the app and could increase the risk of prompt injections.

  Business & Go‑to‑Market
  25. What price range do you think an average solo doctor would accept monthly?
  If our value proposition is such that we are going to position ourselves as somebody as an application who can replace a human being, so in India, the minimum cost somebody is going to pay for this kind of job to a secretary would be ₹15,000. So, I would like my application to this is ₹15,000 per month. If I talk about Healthplix and Prakto, I had paid them for their subscription and they cost around ₹15,000 to ₹20,000 depending upon the various packages they are offering per year. I want my users' decision to be easy; they should be seeing the value that I am offering and my My monthly subscription rate should not be ridiculously high, that it starts seeing like a stupid financial decision for doctors, because not everybody is well off financially who is in medicine or practicing like a doctor.
  26. Would you start with a free pilot for 3–5 doctors?
Yes, obviously.
  Timeline & Resources
  27. What is your budget range for the first 3 months (in INR)?
  I have not decided it yet. Why? Because many things, many questions are unanswered. Where is this application going to live? How am I going to find customers? These are still unanswered questions. I have theories, but I have not found a paying customer yet. I'm yet to test it in the market, so that's why I don't have the correct answer for this question of yours.
  28. Are you open to starting with a very narrow MVP: WhatsApp triage + appointment coordination + document summary?
I stumbled onto something called OpenClaw, or Mold Bot, or Clot Bot. I would like you to have a look at that. I don't want to use a very narrow MVP. I understand this sounds attractive, but I want slightly more functionalities. I would encourage you to have a look at Mold Bot or Clot Bot and think of us offering Mold in two EMR spaces and prescription writing space and digital secretary like status. This is what I want.
  Metrics
  29. What is the primary success metric for you: time saved per day, response time, or patient satisfaction?
  Well, success means a lot of things. It has to be better patient and doctor experience. Even the patient should feel better while having such kind of interference between middleman between them and doctors. Patient should enjoy the luxury of having such kind of secretaries and the doctor should also enjoy the presence of a secretary which can take care of many things that they were that was previously consuming their cognitive that was increasing their cognitive load. And yes, the response time would automatically come down with we had something like this.
  30. What is a tolerable error rate for admin replies (not medical)?
  I am not able to think of the worst possible scenarios when the admin replies are having errors. Sometimes there can be a problem with the API key, sometimes there can be problems with the wrong time appointment given, but these are pardonable errors, and I would not like to have them, but they can be easily taken care of if the doctor is aware what has happened. The doctor can communicate to the patient that "Yes, I'm not available this was my mistake."