# Visual Documentation Index

This directory contains all visual documentation for the Chronicle Ledger project.

## 📊 Available Diagrams

### Architecture & System Design
| Diagram                                        | Description                                                              | Used In                   |
| ---------------------------------------------- | ------------------------------------------------------------------------ | ------------------------- |
| **[architecture.png](./architecture.png)**     | Complete system architecture showing all components and data flow        | README.md, HLD.md         |
| **[complete-flows.png](./complete-flows.png)** | All 5 use case flows (Create, Deposit, Transfer, Time-Travel, Event Log) | README.md, docs           |
| **[cqrs-pattern.png](./cqrs-pattern.png)**     | CQRS pattern visualization with Command/Query separation                 | EVENT_SOURCING.md, HLD.md |
| **[data-journey.png](./data-journey.png)**     | Beautiful infographic showing transaction lifecycle                      | README.md                 |

### Features & Functionality
| Diagram                                      | Description                                      | Used In                     |
| -------------------------------------------- | ------------------------------------------------ | --------------------------- |
| **[time-travel.png](./time-travel.png)**     | Time-Travel query feature with timeline examples | README.md, SETUP_AND_RUN.md |
| **[api-reference.png](./api-reference.png)** | API endpoint map with request/response examples  | SETUP_AND_RUN.md, LLD.md    |
| **[dashboard.png](./dashboard.png)**         | Event Log Viewer UI mockup                       | README.md                   |

### Concepts & Patterns  
| Diagram                                                  | Description                                   | Used In              |
| -------------------------------------------------------- | --------------------------------------------- | -------------------- |
| **[event-sourcing-flow.png](./event-sourcing-flow.png)** | Event Sourcing vs Traditional CRUD comparison | EVENT_SOURCING.md    |
| **[high-availability.png](./high-availability.png)**     | Node failure and recovery demonstration       | FAILURE_SCENARIOS.md |
| **[error-handling.png](./error-handling.png)**           | All error scenarios with recovery paths       | FAILURE_SCENARIOS.md |

### Setup & Testing
| Diagram                                            | Description                                  | Used In          |
| -------------------------------------------------- | -------------------------------------------- | ---------------- |
| **[setup-guide.png](./setup-guide.png)**           | 4-step visual setup guide                    | SETUP_AND_RUN.md |
| **[testing-strategy.png](./testing-strategy.png)** | E2E,Chaos, and Consistency testing workflows | SETUP_AND_RUN.md |

---

## 🎨 Design Principles

All diagrams follow consistent design principles:
- **Color Coding**: Green (APIs), Blue (Frontend/Read DB), Purple (Event Store), Yellow (Processors), Orange (Message Bus)
- **Typography**: Clean, professional fonts (Inter/Roboto)
- **Style**: Modern flat design with subtle shadows
- **Accessibility**: High contrast, clear labels
- **Purpose**: Recruiter-friendly and study-friendly

---

## 📝 Usage Guidelines

### In Documentation
```markdown
![Description](./docs/assets/diagram-name.png)
```

### For Presentations
- All images are high-resolution PNGs
- Suitable for slides, reports, or portfolio
- Can be used independently or combined

### For Study/Review
- Each diagram is self-explanatory
- Includes technical details and flow arrows
- Designed for quick understanding

---

**Total Diagrams**: 12  
**Total Size**: ~7.5 MB  
**Format**: PNG (high resolution)  
**Created**: January 2, 2026
