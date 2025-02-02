---
layout: post
title: "C++11: Rvalue References, Move Semantics, and Perfect Forwarding"
---

Before C++11, terms like **lvalue** and **rvalue** were rarely discussed.  
However, with the introduction of **rvalue references** in C++11, many people—including myself—were left wondering:  
**What exactly is an rvalue?**

To be precise:

1. **Lvalue**: An identifier that has a **distinct memory address**.
2. **Rvalue**: Anything that is **not an lvalue**.
3. **Lvalue Reference**: An alias for an lvalue identifier, commonly referred to as a **reference**.
4. **Rvalue Reference**: An alias for an rvalue identifier.

<!--more--> 

### **Example:**
```cpp
int a = 5;      // `a` is an lvalue, `5` is an rvalue.
int* pA = &a;   // `pA` is an lvalue, `&a` is an rvalue.
int& refA = a;  // `refA` is an lvalue reference (previously just called a reference before C++11), `a` is an lvalue.
int&& rVal = 5; // `rVal` is an rvalue reference.
```
From the example above, we can also observe that:  
- **Lvalues can sometimes be used as rvalues**,  
- **But rvalues can never be used as lvalues**.

A more intuitive way to define **rvalues** is:  
👉 **A temporary object is an rvalue.**

### **What is the purpose of rvalue references?**  
To explore this, let's first consider a class:
```cpp
class Animal {
    int* m_dataArr;
    int  m_dataLength;
    
public:
    Animal() {
        m_dataLength = 10;
        m_dataArr = new int[m_dataLength];
        // Initialization
        ...
    }

    // Copy Constructor
    Animal(const Animal& obj) {
        m_dataLength = obj.m_dataLength;
        m_dataArr = new int[m_dataLength];
        // Copy elements
        for (int i = 0; i < m_dataLength; i++) {
            ...
        }
    }

    // Copy Assignment Operator
    Animal& operator=(const Animal& obj) {
        if (this != &obj) {
            // Perform deep copy similar to Animal(const Animal& obj)
            ...
        }
        return *this;
    }

    ~Animal() {
        delete[] m_dataArr;
    }
};
```
#### **Purpose 1: Move Semantics**

Another new term—what exactly is **"move semantics"**? 🤔  

Most developers are familiar with **copy constructors**—  
these constructors **copy** data from one object to another, essentially **cloning** an instance.  
This behavior is referred to as **copy semantics**.

### **Typical Scenario**:  
Copying an argument from an actual parameter (argument) to a function's formal parameter.

```cpp
void SomeFunc(Animal x) { ... }
Animal CreateAnimal() { ... }

Animal cat;
SomeFunc(cat);  
// 📌 This calls the copy constructor to **copy `cat`'s data into `x`**.

cat....
```
If `SomeFunc(cat);` is followed by **no further usage of `cat`**,  
we often write it like this:

```cpp
SomeFunc(CreateAnimal());  
// The newly created object will be **copied** to `x` and then destroyed—highly wasteful.
```
In this case, the copy operation is **extremely wasteful**—  
the newly created object is **copied** and then **immediately destroyed**.  

### **Why not directly use the data from the newly created object and avoid unnecessary copying?**  

This is where **move semantics** makes perfect sense:  
👉 A **constructor** that **moves** data from one object to another.  

However, there's a key requirement:  
- The **object being moved from must be a temporary object**.  
- Once its contents are moved, it **must not be used again**—meaning it can be **safely destroyed**.  

The constructors responsible for "emptying out" objects are:  
👉 **Move Constructor** & **Move Assignment Operator**  

With move semantics, the `Animal` class now looks like this:
```cpp
class Animal {
    int* m_dataArr;
    int  m_dataLength;

public:
    Animal() {
        m_dataLength = 10;
        m_dataArr = new int[m_dataLength];
        // Initialization
        ...
    }

    // Copy Constructor
    Animal(const Animal& obj) {
        m_dataLength = obj.m_dataLength;
        m_dataArr = new int[m_dataLength];
        // Copy elements
        for (int i = 0; i < m_dataLength; i++) {
            ...
        }
    }

    // Move Constructor
    Animal(Animal&& obj) {
        m_dataLength = obj.m_dataLength;
        m_dataArr = obj.m_dataArr;  // Take ownership of `obj`'s array pointer.
        obj.m_dataArr = nullptr;    // Nullify `obj.m_dataArr` to prevent double deletion in destructor.
    }

    // Copy Assignment Operator
    Animal& operator=(const Animal& obj) {
        if (this != &obj) {
            delete m_dataArr;
            // Perform deep copy similar to Animal(const Animal& obj)
            ...
        }
        return *this;
    }

    // Move Assignment Operator
    Animal& operator=(Animal&& obj) {
        assert(this != &obj);
        delete m_dataArr;
        // Perform move similar to Animal(Animal&& obj)
        ...
    }

    ~Animal() {
        delete[] m_dataArr;
    }
};
```
For now, let's ignore the details of the **assignment operators** and **move assignment operator**,  
and focus only on the **copy constructor** and **move constructor**.  

Next, let's add an **overloaded version** of `SomeFunc`, so it becomes:
```cpp
// void SomeFunc(Animal x) { ... }       
// 🚫 The normal version cannot coexist with the two versions below 
//    as it would cause ambiguity in function calls.

void SomeFunc(Animal& x) { ... }         // ✅ Lvalue reference version
void SomeFuncR(Animal&& x) { ... }       // ✅ Rvalue reference version

Animal cat;
SomeFunc(cat);                           // ✅ `cat` is an lvalue, calls `void SomeFunc(Animal& x)`

SomeFunc(CreateAnimal());                // ✅ `CreateAnimal()` returns an rvalue,
                                         //    calls `void SomeFunc(Animal&& x)`, invoking the **move constructor**.

SomeFunc(std::move(cat));                // ✅ Calls `void SomeFunc(Animal&& x)`, invoking the **move constructor**.
                                         //    `cat` is now in a moved-from state (its contents are "emptied").
                                         //    However, `cat` **is not immediately destroyed**; 
                                         //    its destructor will be called when it goes out of scope.
```
#### **Purpose 2: Perfect Forwarding**

Move semantics are relatively easy to understand,  
but **perfect forwarding** is not as intuitive.  

Let's first explore what **"forwarding"** and **"imperfect forwarding"** mean through code examples.
```cpp
template <typename T>
void TempFunc(T t) {
    // The `TempFunc` template function forwards `t` to `SomeFunc`.
    // This process is known as **Argument Forwarding**.
    SomeFunc(t);
}
```
In the **move semantics** section, we learned that:  

- `SomeFunc(cat)` matches the **lvalue reference** version of `SomeFunc`.  
- `SomeFunc(CreateAnimal())` matches the **rvalue reference** version of `SomeFunc`.  

Now, we wrap `SomeFunc` inside another function **`TempFunc`**.  
Consider the following function calls:
```cpp
	TempFunc(cat);
	TempFunc(CreateAnimal());
```
Inside `TempFunc`, which version of `SomeFunc` will be matched?  

👉 **Both function calls will match the lvalue reference version of `SomeFunc`**.  

**Holy shit!** 🤯  
Why does this happen?  

👉 Because **all function parameters are treated as lvalues inside the function**.  

### **How can we make `TempFunc(CreateAnimal())` match the rvalue reference version of `SomeFunc`?**  
By implementing **Perfect Forwarding** like this:
```cpp
template <typename T>
void TempFunc(T&& t) { // `T&&` here is known as a **universal reference**.
    SomeFunc(std::forward<T>(t));
}
```
With this template function definition, we achieve **perfect forwarding**:  

- When calling `TempFunc(cat)`, it matches the **lvalue reference** version of `SomeFunc`.  
- When calling `TempFunc(CreateAnimal())`, it matches the **rvalue reference** version of `SomeFunc`.  

For a deeper understanding of **why this code enables perfect forwarding**,  
as well as the internal implementations of **`std::move` and `std::forward`**,  
please refer to another blog post. 🚀  
