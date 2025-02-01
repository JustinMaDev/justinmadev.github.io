---
layout: post
title: "C++11 Feature Highlights: New Keywords"
---

C++11 introduced a large number of new features. This article provides a brief overview of each feature without going into too much detail—covering every aspect thoroughly would require an entire blog post for each feature.

To organize these new features, this series is divided into three parts: new keywords, new semantics, and new additions to the standard library. Initially, I planned to include all three sections in a single blog post, but it turned out to be too long, so I decided to split them into separate articles.

<!--more--> 
### 0. Key Feature Overview

In my opinion, the four most significant features in C++11 are **`auto`**, **uniform initialization (`{}`)**, **rvalue references**, and **lambda expressions**.

- **`auto`** simplifies variable declarations.  
- **Uniform initialization** (using `{}`) standardizes initialization syntax.  
- **Rvalue references** enable move semantics, significantly improving performance.  
- **Lambda expressions** make code more concise and enhance readability, especially when defined within function bodies, improving encapsulation and aligning better with everyday programming thought processes.  

Of course, other features, such as **variadic templates** and the **multithreading library**, are also noteworthy and deserve in-depth discussion. However, given my limited expertise, I can only provide a brief summary of various features, which I refer to as a **"highlights collection."**

### 1. New Keywords

#### 1.1 `auto`, `decltype`

In fact, the `auto` keyword was already used in C++98 to indicate that a variable had an automatic storage duration. However, it was rarely used in practice. The C++11 standard deprecated this old usage and repurposed `auto` for automatic type deduction.

The introduction of `auto` significantly reduces code length—allowing the compiler to infer the type of an identifier instead of requiring manual specification. In most cases, the compiler can clearly determine the exact type of an identifier.

~~~cpp
vector<int> arr;
......
vector<int>::iterator it = arr.begin();
auto it2 = arr.begin();// This is way more convenient than the previous code.
~~~
However, the introduction of `auto` also has a minor drawback—it sacrifices some code readability. For example:
~~~cpp
auto value = myFunction();
~~~
The compiler will clearly know the type of `value`, but the programmer may not—unless they check the function declaration of `myFunction`. However, overall, the benefits far outweigh the drawbacks.

When initializing a variable with a value or expression, we can use `auto` to declare the variable, allowing the compiler to automatically deduce its type. However, in some cases, we may not want to initialize a variable with a value or expression but instead declare a variable using only the type of a value. In such situations, we can use the `decltype` keyword, which can extract the type of a variable or expression:
~~~cpp
// The type of `value` is the return type of `myFunction`. The function `myFunction` is not actually executed here.
decltype(myFunction()) value;
~~~
It is worth noting that the result deduced by `decltype` is closely related to the form of the expression. If the expression is enclosed in one or more pairs of parentheses, the resulting type will be a reference type:

~~~cpp
int a = 10;
decltype(a) b;   // Correct, the type of `b` is `int`, and `b` is uninitialized.
decltype((a)) c; // Error, the type of `c` is `int&`, and it must be initialized.
~~~

#### 1.2 `=default`, `=delete`, `override`, `final`

These newly introduced keywords are used in class design. The `=default` and `=delete` keywords modify functions that the compiler automatically generates (such as constructors and assignment operator overloads). 

- `=default` explicitly declares that the compiler should generate the function.
- `=delete` explicitly declares that the compiler should not generate the function.

For example:
~~~cpp
class Demo{
   public:
    Demo(const int a):m_a{a}{}
   private:
    int m_a;
};
~~~
At this point, the compiler will no longer generate a default constructor for `Demo`. If you want to use the compiler-generated default constructor, you can do it like this:
~~~cpp
class Demo{
public:
    Demo() =default;
    Demo(const int a):m_a{a}{}
private:
    int m_a;
};
~~~
You can prevent the copy constructor of `Demo2` like this:

~~~cpp
class Demo2{
public:
    Demo(const Demo& obj) =delete;
private:
    int m_a;
};
~~~
**override** and **final** are used for inheritance control. 

- `override` tells the compiler that a subclass is overriding a virtual function from the parent class. It ensures that the overridden function in the subclass has the same signature as the virtual function in the base class, preventing issues where a function is mistakenly declared with an incorrect parameter list, rendering the override ineffective.

- `final` has two purposes:
  - When applied to a class, it prevents the class from being inherited.
  - When applied to a virtual function, it prevents the function from being overridden by subclasses.

~~~cpp
class FinalBase final{}
class A:public FinalBase{} // Error: `FinalBase` cannot be inherited.
class B{
public:
	virtual int funcA(int x){}
	virtual int funcB(int x) final{}
}
class C:public B{
	public:
	virtual int funcA(int x) override{...} // Ok, overriding `funcA`.
	virtual int funcB(int x) {...}			   // Error: `funcB` has been declared as `final`.
}
~~~
#### 1.3 `nullptr`

With the introduction of `nullptr`, the use of `NULL` or `0` to represent a null pointer should be avoided. Both `NULL` and `0` are essentially integers rather than pointer types. `nullptr` enforces stricter type checking.

Consider the following code:
~~~cpp
void f(void*){...}
void f(int){...}
int main(){
    f(NULL);   // This call is ambiguous.
    f(nullptr);//OK，call void f(void*)
~~~
#### 1.4 `constexpr`

This keyword is very similar to `const`, making it easy to confuse the two. 

- `const` can represent both **compile-time constants** and **runtime constants**, with an emphasis on the **"read-only"** characteristic.  
- `constexpr`, on the other hand, is **exclusively used for compile-time constants**, indicating that the expression's value can be determined at compile time, allowing the compiler to optimize it as much as possible.

```cpp
int func(int p){
    const int a = 5;        // `a` is a compile-time constant.
    const int b = p;        // `b` is a runtime constant.
    constexpr int c = 6;    // `c` is a compile-time constant.
    constexpr int c = p;    // Compilation error.
    std::array<int, a> arr1; // Ok.
    std::array<int, b> arr2; // Compilation error.
    std::array<int, c> arr3; // Ok.
}
```
Additionally, if a function's return value is marked with `constexpr`, the compiler will attempt to evaluate the function call result at compile time whenever possible:

```cpp
constexpr int calcLength(const int& x){
    return x * 5;
}
int calcLength2(const int& x){
    return x * 5;
}
std::array<int, calcLength(2)> arr10; // ✅ OK, `arr10` is an array of 10 elements.
                                      // `calcLength(2)` is evaluated at compile time, and `10` replaces `calcLength(2)` directly.
std::array<int, calcLength2(3)> arr15; // ❌ Compilation error: `calcLength2` is not a `constexpr` function.
int a{5};
int b = calcLength(a);                // ✅ OK, but `calcLength(a)` is no longer evaluated at compile time
                                      // because `a` is a variable (not a constant expression).
constexpr c = calcLength(a);          // ❌ Compilation error: `calcLength(a)` cannot be a `constexpr`
                                      // because `a` is a runtime variable, making the result non-constant.

```
Additionally, both `const` and `constexpr` can be used to modify pointers, but they have different meanings.  

- `const` can serve as both **low-level const** (modifying the pointed-to content) and **top-level const** (modifying the pointer itself).  
- `constexpr`, when applied to pointers, only modifies the pointer itself and does not affect the pointed-to content.

### Example:

```cpp
int x = 2;
const int *a;              // `a` points to a constant `int`.

int* const b = &x;         // `b` is a constant pointer to an `int` variable.
                           // Once initialized, `b` cannot change its target—it is a pointer constant.

constexpr int *c = nullptr; // `c` is a pointer constant.
                            // It must be initialized at definition, the value must be determinable at compile time, and its target cannot be changed afterward.
```

#### 1.5 `noexcept`

The `noexcept` keyword tells the compiler that the function will not throw exceptions.  
This allows the compiler to perform additional optimizations.
