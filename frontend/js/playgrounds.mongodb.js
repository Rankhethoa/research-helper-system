const database = 'serviceFinder';
const collection = 'students';

// The current database to use.
use(database);

// Create a new collection.
db.createCollection("students", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["name", "college", "contact"],
        properties: {
  
          name: {
            bsonType: "string",
            description: "Full name "
          },
  
          college: {
            bsonType: "string",
            description: "e.g. 'College of Software'"
          },
  
          contact: {
            bsonType: "object",
            required: ["email"],        
            properties: {
              email: {
                bsonType: "string",
                pattern: "^[^@]+@[^@]+\\.[^@]+$",
                description: "Must be a valid email address"
              }
            }
          },
  
          // Array of research areas (preferred over single research_area string)
          researchAreas: {
            bsonType: "array",
            items: { bsonType: "string" },
            description: "List of research areas, e.g. ['Machine Learning', 'NLP']"
          }
        }
      }
    },
    validationAction: "warn"  
  });

  db.students.insertMany([
    {
      name: "Jane Doe",
      college: "College of Artificial Intelligence",
      researchAreas: ["Control for the autonomy of robots", "Robotic systems"],
      contact: {
        email: "hanjianda@mail.nankai.edu.cn",
      }
    },
    {
        name: "John Jonathan ",
        college: "College of Artificial Intelligence",
        researchAreas: ["Nonlinear estimation and control", "Control for the autonomy of robots"],
        contact: {
          email: "jjonathan@mail.nankai.edu.cn",
        }
    },
    {
        name: "Mpoi Rankhethoa",
        college: "College of Sotftware",
        researchAreas: ["Python libraries", "Impact of AI"],
        contact: {
          email: "rankhethoam@mail.nankai.edu.cn",
        }
    },
    {
      name: "Li Wei",
      college: "College of Artificial Intelligence",
      researchAreas: ["Machine Learning", "Computer Vision", "AI Ethics"],
      contact: { email: "liwei@mail.nankai.edu.cn" }
    },
    {
      name: "Zhang Min",
      college: "College of software",
      researchAreas: ["Software Engineering", "Microservices", "Cloud Computing"],
      contact: { email: "zhangmin@mail.nankai.edu.cn" }
    },
    {
      name: "Wang Fang",
      college: "Computer Science and Engineering",
      researchAreas: ["Data Structures", "Algorithms", "Distributed Systems"],
      contact: { email: "wangfang@mail.nankai.edu.cn" }
    },
    {
      name: "Chen Hao",
      college: "Department of Software Engineering",
      researchAreas: ["DevOps", "CI/CD", "System Design"],
      contact: { email: "chenhao@mail.nankai.edu.cn" }
    },
    {
      name: "Liu Yang",
      college: "Department of Information Theory and Data Science",
      researchAreas: ["Big Data", "Data Mining", "Analytics"],
      contact: { email: "liuyang@mail.nankai.edu.cn" }
    },
    {
      name: "Yang Jie",
      college: "Department of Applied Mathematics",
      researchAreas: ["Numerical Methods", "Modeling", "Optimization"],
      contact: { email: "yangjie@mail.nankai.edu.cn" }
    },
    {
      name: "Zhao Rui",
      college: "Department of Automation",
      researchAreas: ["Control Systems", "Robotics", "Automation"],
      contact: { email: "zhaorui@mail.nankai.edu.cn" }
    },
    {
      name: "Sun Mei",
      college: "Department of Automation and Intelligent Science",
      researchAreas: ["AI", "Smart Systems", "Autonomous Control"],
      contact: { email: "sunmei@mail.nankai.edu.cn" }
    },
    {
      name: "Gao Peng",
      college: "Department of Communications Engineering",
      researchAreas: ["5G", "Wireless Networks", "Signal Processing"],
      contact: { email: "gaopeng@mail.nankai.edu.cn" }
    },
    {
      name: "Hu Lin",
      college: "Physics",
      researchAreas: ["Quantum Mechanics", "Particle Physics", "Simulation"],
      contact: { email: "hulin@mail.nankai.edu.cn" }
    },
  
    {
      name: "Tang Yu",
      college: "College of life sciences",
      researchAreas: ["Genomics", "Bioinformatics", "Molecular Biology"],
      contact: { email: "tangyu@mail.nankai.edu.cn" }
    },
    {
      name: "Deng Kai",
      college: "College of pharmacy",
      researchAreas: ["Drug Discovery", "Pharmacology", "Medicinal Chemistry"],
      contact: { email: "dengkai@mail.nankai.edu.cn" }
    },
    {
      name: "Feng Qian",
      college: "School of medicine",
      researchAreas: ["Clinical Research", "Epidemiology", "Health Data"],
      contact: { email: "fengqian@mail.nankai.edu.cn" }
    },
    {
      name: "He Xin",
      college: "Department of Pathogenic Microbiology",
      researchAreas: ["Virology", "Immunology", "Infectious Diseases"],
      contact: { email: "hexin@mail.nankai.edu.cn" }
    },
    {
      name: "Xu Lei",
      college: "Department of Biomaterials and Tissue Engineering",
      researchAreas: ["Biomaterials", "Tissue Engineering", "Regenerative Medicine"],
      contact: { email: "xulei@mail.nankai.edu.cn" }
    },
  
    {
      name: "Qin Yue",
      college: "Economics",
      researchAreas: ["Macroeconomics", "Development Economics", "Policy Analysis"],
      contact: { email: "qinyue@mail.nankai.edu.cn" }
    },
    {
      name: "Zhou Ning",
      college: "Department of International Economics and Trade",
      researchAreas: ["Global Trade", "Trade Policy", "Econometrics"],
      contact: { email: "zhouning@mail.nankai.edu.cn" }
    },
    {
      name: "Shen Yi",
      college: "Department of International Business",
      researchAreas: ["Global Markets", "Business Strategy", "Finance"],
      contact: { email: "shenyi@mail.nankai.edu.cn" }
    },
    {
      name: "Pan Lei",
      college: "Department of Business Administration",
      researchAreas: ["Management", "Entrepreneurship", "Operations"],
      contact: { email: "panlei@mail.nankai.edu.cn" }
    },
    {
      name: "Ma Jun",
      college: "Management Science & Engineering",
      researchAreas: ["Decision Science", "Optimization", "Supply Chains"],
      contact: { email: "majun@mail.nankai.edu.cn" }
    },
  
    {
      name: "Cao Lin",
      college: "Accounting",
      researchAreas: ["Auditing", "Financial Reporting", "Taxation"],
      contact: { email: "caolin@mail.nankai.edu.cn" }
    },
    {
      name: "Guo Jie",
      college: "Department of Mathematical Finance and Actuarial Science",
      researchAreas: ["Risk Analysis", "Actuarial Models", "Finance"],
      contact: { email: "guojie@mail.nankai.edu.cn" }
    },
  
    {
      name: "Lin Tao",
      college: "Department of Pure Mathematics",
      researchAreas: ["Algebra", "Topology", "Number Theory"],
      contact: { email: "lintao@mail.nankai.edu.cn" }
    },
    {
      name: "Ren Fei",
      college: "Department of Logic",
      researchAreas: ["Formal Logic", "Philosophy of Logic", "Reasoning"],
      contact: { email: "renfei@mail.nankai.edu.cn" }
    },
    {
      name: "Lu Chen",
      college: "College of Philosophy",
      researchAreas: ["Ethics", "Metaphysics", "Philosophy of Mind"],
      contact: { email: "luchen@mail.nankai.edu.cn" }
    },
    {
      name: "Xie Na",
      college: "Faculty of History",
      researchAreas: ["Modern History", "Asian Studies", "Cultural History"],
      contact: { email: "xiena@mail.nankai.edu.cn" }
    },
  
    {
      name: "Bai Yu",
      college: "Institute of Machine Intelligence",
      researchAreas: ["Deep Learning", "Neural Networks", "AI Systems"],
      contact: { email: "baiyu@mail.nankai.edu.cn" }
    },
    {
      name: "Jiang Wen",
      college: "Institute of Robotics and Automatic Information System",
      researchAreas: ["Robotics", "Automation", "Embedded Systems"],
      contact: { email: "jiangwen@mail.nankai.edu.cn" }
    },
    {
      name: "Zheng Li",
      college: "Institute of Robotics and Automatic Information Systems",
      researchAreas: ["Robotics", "Control Systems", "AI"],
      contact: { email: "zhengli@mail.nankai.edu.cn" }
    },
    {
      name: "Huang Bo",
      college: "Institute of Robotics and Information System Automation",
      researchAreas: ["Automation", "AI", "Smart Systems"],
      contact: { email: "huangbo@mail.nankai.edu.cn" }
    },
    {
      name: "Wu Dan",
      college: "Institute of robotics and information automation",
      researchAreas: ["IoT", "Edge Computing", "Smart Devices"],
      contact: { email: "wudan@mail.nankai.edu.cn" }
    },
  
    {
      name: "Ye Qing",
      college: "Institute of Modern Optics",
      researchAreas: ["Optics", "Photonics", "Laser Systems"],
      contact: { email: "yeqing@mail.nankai.edu.cn" }
    },
  
    // extra to reach 40+
    {
      name: "Han Rui",
      college: "College of Artificial Intelligence",
      researchAreas: ["Reinforcement Learning", "AI Safety", "Robotics"],
      contact: { email: "hanrui@mail.nankai.edu.cn" }
    },
    {
      name: "Meng Xi",
      college: "Computer Science and Engineering",
      researchAreas: ["Distributed Systems", "Cloud", "Scalability"],
      contact: { email: "mengxi@mail.nankai.edu.cn" }
    },
    {
      name: "Pei Jun",
      college: "Department of Communications Engineering",
      researchAreas: ["Networking", "Protocols", "Routing"],
      contact: { email: "peijun@mail.nankai.edu.cn" }
    },
    {
      name: "Dong Li",
      college: "Department of Intelligence Engineering",
      researchAreas: ["AI", "Autonomous Systems", "Smart Tech"],
      contact: { email: "dongli@mail.nankai.edu.cn" }
    },
    {
      name: "Ke Xin",
      college: "College of software",
      researchAreas: ["Web Development", "Backend", "APIs"],
      contact: { email: "kexin@mail.nankai.edu.cn" }
    },
    {
      name: "Fan Yu",
      college: "Department of Business Administration",
      researchAreas: ["Marketing", "Strategy", "Consumer Behavior"],
      contact: { email: "fanyu@mail.nankai.edu.cn" }
    },
    {
      name: "Yu Lei",
      college: "Economics",
      researchAreas: ["Statistics", "Econometrics", "Forecasting"],
      contact: { email: "yulei@mail.nankai.edu.cn" }
    },
    {
      name: "Zou Kai",
      college: "Management Science & Engineering",
      researchAreas: ["Optimization", "Operations Research", "Analytics"],
      contact: { email: "zoukai@mail.nankai.edu.cn" }
    }

]);