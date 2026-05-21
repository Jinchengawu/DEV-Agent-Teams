---
name: selenium
description: Selenium 浏览器自动化测试
tags: [testing, selenium, browser, automation]
---

# Selenium 浏览器自动化技能

## 触发条件

- 跨浏览器测试
- Web 应用自动化
- 回归测试
- 爬虫和数据抓取

## 安装配置

```bash
# Python
pip install selenium webdriver-manager

# Java
# pom.xml 添加依赖

# npm
npm install selenium-webdriver
```

## Python 示例

```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# 初始化浏览器
driver = webdriver.Chrome(ChromeDriverManager().install())

# 访问页面
driver.get("https://example.com")

# 查找元素
element = driver.find_element(By.ID, "username")
element.send_keys("user@example.com")

# 等待元素
wait = WebDriverWait(driver, 10)
element = wait.until(
    EC.presence_of_element_located((By.ID, "submit"))
)

# 点击
element.click()

# 获取文本
text = driver.find_element(By.TAG_NAME, "h1").text

# 截图
driver.save_screenshot("screenshot.png")

# 关闭
driver.quit()
```

## Java 示例

```java
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.By;
import org.openqa.selenium.chrome.ChromeDriver;

public class SeleniumTest {
    public static void main(String[] args) {
        WebDriver driver = new ChromeDriver();
        
        driver.get("https://example.com");
        
        WebElement username = driver.findElement(By.id("username"));
        username.sendKeys("user@example.com");
        
        WebElement submit = driver.findElement(By.id("submit"));
        submit.click();
        
        String title = driver.getTitle();
        System.out.println("Page title: " + title);
        
        driver.quit();
    }
}
```

## Page Object 模式

```python
# pages/login_page.py
class LoginPage:
    def __init__(self, driver):
        self.driver = driver
        self.username_input = (By.ID, "username")
        self.password_input = (By.ID, "password")
        self.submit_button = (By.ID, "submit")
    
    def goto(self):
        self.driver.get("https://example.com/login")
        return self
    
    def login(self, username, password):
        self.driver.find_element(*self.username_input).send_keys(username)
        self.driver.find_element(*self.password_input).send_keys(password)
        self.driver.find_element(*self.submit_button).click()
        return DashboardPage(self.driver)

# tests/test_login.py
def test_login():
    driver = webdriver.Chrome()
    login_page = LoginPage(driver)
    dashboard = login_page.goto().login("user@example.com", "password")
    assert "Dashboard" in dashboard.title
    driver.quit()
```

## 等待策略

```python
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# 显式等待
wait = WebDriverWait(driver, 10)
element = wait.until(
    EC.presence_of_element_located((By.ID, "element"))
)

# 隐式等待
driver.implicitly_wait(10)

# 条件等待
wait.until(EC.element_to_be_clickable((By.ID, "button")))
wait.until(EC.text_to_be_present_in_element((By.ID, "result"), "Success"))
```

## 最佳实践

### 选择器优先级
```python
# 1. ID（推荐）
driver.find_element(By.ID, "submit")

# 2. Name
driver.find_element(By.NAME, "username")

# 3. Class Name
driver.find_element(By.CLASS_NAME, "btn-primary")

# 4. CSS Selector
driver.find_element(By.CSS_SELECTOR, "button[type='submit']")

# 5. XPath（避免）
driver.find_element(By.XPATH, "//button[@type='submit']")
```

### 测试数据管理
```python
# 使用 fixture
@pytest.fixture
def driver():
    driver = webdriver.Chrome()
    yield driver
    driver.quit()

# 使用数据文件
import json
with open('test_data.json') as f:
    test_data = json.load(f)
```

### CI 集成
```yaml
# GitHub Actions
- name: Run Selenium tests
  uses: browser-actions/setup-chrome@latest
  with:
    chrome-version: stable
- run: python -m pytest tests/
```

---

**技能版本**：v1.0
