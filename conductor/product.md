# Product Guide: Eyas

## 1. Vision
Eyas is a tool designed to provide simplified, hands-on testing for web applications. Its core vision is to dramatically reduce the complexity and friction in the feedback loop between developers and various stakeholders, enabling faster, more confident deployment cycles.

## 2. Target Users
Eyas is built for a range of technical and non-technical users within a software development lifecycle:

- **QA Engineers:** For executing formal testing cycles on specific feature branches in a stable, isolated environment.
- **Product Owners/Managers:** For conducting user acceptance testing (UAT) and verifying that features meet business requirements.
- **All Stakeholders:** Any individual who benefits from seeing a snapshot of development work in progress, from designers to end-users participating in early feedback rounds.

## 3. Core Goals
The primary goals that Eyas helps users achieve are:

- **Simplify Feedback:** Drastically shorten the time it takes to get feedback on new features or bug fixes, especially from non-technical team members.
- **Isolate Testing:** Provide a reliable and contained environment for testing development branches before they are merged into the main codebase.
- **Enable A/B Testing:** Facilitate the distribution of different versions of a user interface to gather feedback on design and UX changes.

## 4. Key Features
While Eyas supports multiple distribution methods, the primary workflow revolves around its most critical feature:

- **Eyas Database Files (`.eyas`):** This involves generating a lightweight database file that contains the entire test build. This file can be easily shared and opened by any user who has the Eyas runner installed, making it the ideal method for frequent testers.
