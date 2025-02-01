---
layout: post
title: "C++11 Feature Highlights: New Library"
---

The new version of the standard library introduces many new features.  
This article only provides a brief overview of their usage **without delving into the underlying principles**,  
as a deeper exploration would make the article excessively long.

<!--more--> 
##### 1. Smart Pointers: `std::shared_ptr`, `std::make_shared`, `std::unique_ptr`, `std::weak_ptr`

C++ developers have long suffered from the pains of manually managing memory with `new` and `delete`.  
Using `new` and `delete` frequently leads to **memory leaks** (forgetting to delete allocated memory), **dangling pointers** (accessing memory after deletion), and **double deletions**, making memory management a major source of bugs.  

With **smart pointers**, life becomes much easier—**as long as they are used correctly**.  
Incorrect usage, however, can lead to even more subtle and difficult-to-debug issues.

- **`shared_ptr`**:  
  Manages a dynamically allocated object and maintains a **reference count**.  
  Multiple `shared_ptr` instances can point to the same object.  
  Every time a new `shared_ptr` points to the same object (through copy or assignment), the reference count increases.  
  When the reference count reaches zero, the object is **automatically destroyed**.

- **`unique_ptr`**:  
  Exclusively owns a dynamically allocated object, **ensuring single ownership**.  
  `unique_ptr` **does not support copy or assignment**, but it **supports move operations** (move assignment and move construction).

- **`weak_ptr`**:  
  A lightweight **non-owning** smart pointer.  
  It simply references an object managed by `shared_ptr` **without affecting the reference count**.  
  Since `weak_ptr` does not control object lifetime, it is **more lightweight** than `shared_ptr`.

---

### **Common Mistakes That Lead to Issues**
```cpp
int * pa = new int(10);
shared_ptr<int> spb(pa); // ❌ Incorrect: Transfers ownership of the dynamically allocated object to `shared_ptr`.

shared_ptr<int> spc(spb.get()); 
// ❌ Prohibited: Do not use `get()` to initialize another `shared_ptr`. 
// `spb`'s reference count does not increase, leading to potential double deletion issues.

delete spb.get(); 
// ❌ Prohibited: Never manually delete memory managed by a `shared_ptr`. 
// The `shared_ptr` will handle deallocation when the reference count reaches zero.

weak_ptr<int> wpd(spb); 
// ✅ Correct: Use a `shared_ptr` to initialize a `weak_ptr`.
// `weak_ptr` does not increase the reference count.

......

*pa = 11; 
// ❌ Potential issue: The dynamically allocated object may have already been destroyed.
```
Example of Correct Usage of the Three Smart Pointers:
~~~ cpp
auto pa = make_shared<int> (10);
auto pb = pa;
~~~
##### 2. `std::move` and `std::forward`

Move semantics are widely used throughout the C++11 standard library, helping to **eliminate unnecessary copies** and improve performance.  
The `std::move` function allows a **left-value (lvalue) to be converted into a right-value (rvalue) at compile time**.  

For a deeper discussion on the usage and principles of `std::move` and `std::forward`, please refer to **two separate blog posts**. This section will not cover them in detail.

---

##### 3. `std::function` and `std::bind`

In C++, there are several types of **callable objects**, meaning objects that can be invoked like functions:

- **Ordinary functions**
- **Lambda expressions**
- **Function pointers**
- **Objects that implement `operator()` (functors)**
- **Member functions**

Each of these has a different way of being called. However, with **`std::function`**, they can be **invoked in a uniform manner** (except for member functions).  

`std::function` is a **callable object wrapper**, implemented as a class template.  
It can store and handle **all callable objects except class member function pointers**, providing a unified way to **store, manage, and delay the execution of functions, function objects, and function pointers**.

On the other hand, **`std::bind`** can bind a callable obj
```cpp
int add(int a, int b) { ...... }

class Minus {
    int operator()(int a, int b) { ..... }
};

Minus minusObj;

auto add2 = add;  
// Calling `add2(3, 4)` is equivalent to calling `add(3, 4)`.
// The type of `add2` is `std::function<int(int, int)>`.

auto minus2 = std::bind(Minus::operator(), &minusObj);  
// Calling `minus2(3, 4)` is equivalent to calling `minusObj(3, 4)`.  
// `std::bind` is used to create a callable object bound to `minusObj`.

auto minus3 = std::bind(Minus::operator(), &minusObj, 3);  
// Calling `minus3(4)` is equivalent to calling `minusObj(3, 4)`.  
// `std::bind` can also reduce the number of parameters, simplifying the function call.
```
With `std::function` and `std::bind`, callback mechanisms and similar patterns are **greatly simplified**.  
They allow replacing **inheritance relationships with composition**, eliminating many unnecessary **complex design patterns**.

---

##### 4. `std::initializer_list`

Before C++11, if we wanted to initialize a `vector` with multiple values, we had to do it like this:

~~~cpp
vector<int> vec03;
vec03.push_back(1);
vec03.push_back(2);
......
vector<int> vec11 = {1,2,3}; //c++11

int a = 3.3; //OK
int b = {3.3}//ERROR, narowing convertion is forbidden
~~~
This utilizes **C++11's `std::initializer_list`**, which is included in the standard library header `<initializer_list>`.  

Not only can STL container types use this feature, but it is also **recommended** for built-in types, as it **enforces stricter type checking**.  

Additionally, **user-defined classes** can also support this type of initialization **by implementing a special constructor**!

~~~cpp
class Num
{
  private:
    std::vector<int> m_vec;
  public:
    Num(const std::initializer_list<int> &v){
        for (auto a : v){
            m_vec.push_back(a);
        }
    }
}
int main{
	Num num = {4,5,6};
	return 0;
}
~~~

##### 5. `std::tuple` and `std::tie`

The biggest difference between `tuple` and containers like `vector` or `array`  
is that the latter store elements of the **same type**,  
while the former can store elements of **different types**, but with a **fixed size**.

```cpp
auto tuple_a = make_tuple("str", 'c', 1, 1.1);  
// Equivalent to:  
tuple<char *, char, int, double> tuple_a("str", 'c', 1, 1.1);  

string a;
char b;
int c;
double d;

std::tie(a, b, c, d) = tuple_a;  
// Unpack the elements from the tuple using `tie`.

Alternatively, retrieve values by position:  
cout << get<0>(tuple_a) << get<1>(tuple_a) << endl;  
// Access tuple elements using `get<index>`.

Get the tuple length:  
cout << tuple_size<decltype(tuple_a)>::value;  
// Retrieve the number of elements in the tuple.
```
#### 6. `std::array`

`std::array` is similar to `std::vector`, as both extend the functionality of arrays.  
However, there are key differences between them:

- **Memory Storage**:  
  - `std::array` is stored on the **stack**.  
  - `std::vector` is stored on the **heap**.

- **Size Requirement**:  
  - The length of a `std::array` **must be a compile-time constant**, meaning it can be determined at compile time.

```cpp
std::array<int, 4> arr = {1, 2, 3, 4};  
// ✅ Valid: The size of `std::array` is a compile-time constant.

int len = 4;  
std::array<int, len> arr = {1, 2, 3, 4};  
// ❌ Invalid: The size parameter of `std::array` must be a constant expression.
```